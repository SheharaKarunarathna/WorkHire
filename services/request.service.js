
const pool = require('../db');
const { sendNotification, emitToJobRoom } = require('./socket.service');
const { bookScheduleSlot, releaseScheduleSlot } = require('./schedule.service');

async function ensureWorkerRole(client, workerAccountId) {
	const workerRoleResult = await client.query(
		`SELECT 1 FROM account_roles WHERE account_id = $1 AND role = 'worker'::account_role LIMIT 1`,
		[workerAccountId]
	);

	if (workerRoleResult.rowCount === 0) {
		const error = new Error('target_worker_account_id must belong to a worker account');
		error.statusCode = 400;
		throw error;
	}
}

async function createRequest(userAccountId, payload) {
	const client = await pool.connect();

	const {
		request_type,
		title,
		description,
		location,
		target_worker_account_id,
		budget,
		urgency,
		preferred_start,
		preferred_end,
		slot_id,
	} = payload;

	try {
		await client.query('BEGIN');

		if (request_type === 'direct') {
			await ensureWorkerRole(client, target_worker_account_id);
		}

		const requestInsertResult = await client.query(
			`INSERT INTO requests (
				user_account_id,
				request_type,
				title,
				description,
				location,
				status
			) VALUES ($1, $2, $3, $4, $5, 'pending')
			RETURNING id, user_account_id, request_type, title, description, location, status, assigned_worker_account_id, created_at, updated_at`,
			[userAccountId, request_type, title, description || null, location]
		);

		const createdRequest = requestInsertResult.rows[0];
		let directDetails = null;

		if (request_type === 'direct') {
			const directInsertResult = await client.query(
				`INSERT INTO direct_request_details (
					request_id,
					target_worker_account_id,
					budget,
					urgency,
					preferred_start,
					preferred_end,
					response_status
				) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
				RETURNING request_id, target_worker_account_id, budget, urgency, preferred_start, preferred_end, response_status, response_note, responded_at, created_at, updated_at`,
				[
					createdRequest.id,
					target_worker_account_id,
					budget ?? null,
					urgency ?? null,
					preferred_start ?? null,
					preferred_end ?? null,
				]
			);

			directDetails = directInsertResult.rows[0];
		}

		if (slot_id) {
			await bookScheduleSlot(
				client,
				slot_id,
				createdRequest.id,
				request_type === 'direct' ? target_worker_account_id : null
			);
		}

		await client.query(
			`INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
			VALUES ($1, NULL, 'pending', $2, 'Request created')`,
			[createdRequest.id, userAccountId]
		);

		await client.query('COMMIT');

		if (request_type === 'direct' && target_worker_account_id) {
			sendNotification(target_worker_account_id, 'notification:direct_request', {
				request_id: createdRequest.id,
				title: createdRequest.title,
				description: createdRequest.description,
				location: createdRequest.location,
				requester_account_id: userAccountId,
				budget: directDetails?.budget,
				urgency: directDetails?.urgency,
				preferred_start: directDetails?.preferred_start,
				preferred_end: directDetails?.preferred_end,
				created_at: createdRequest.created_at,
			});
		}

		return {
			...createdRequest,
			direct_details: directDetails,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function getIncomingDirectRequests(workerAccountId) {
	const query = `
		SELECT 
			r.id AS request_id,
			r.user_account_id,
			u.full_name AS requester_name,
			u.email AS requester_email,
			u.phone AS requester_phone,
			r.title,
			r.description,
			r.location,
			r.status AS request_status,
			d.budget,
			d.urgency,
			d.preferred_start,
			d.preferred_end,
			d.response_status,
			d.response_note,
			d.responded_at,
			r.created_at
		FROM direct_request_details d
		JOIN requests r ON d.request_id = r.id
		JOIN accounts u ON r.user_account_id = u.id
		WHERE d.target_worker_account_id = $1
		ORDER BY r.created_at DESC
	`;

	const result = await pool.query(query, [workerAccountId]);
	return result.rows;
}

async function respondToDirectRequest(workerAccountId, requestId, { action, note }) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// 1. Fetch direct request details
		const directResult = await client.query(
			`SELECT d.request_id, d.target_worker_account_id, d.response_status, r.status AS current_request_status, r.user_account_id
			 FROM direct_request_details d
			 JOIN requests r ON d.request_id = r.id
			 WHERE d.request_id = $1 LIMIT 1 FOR UPDATE`,
			[requestId]
		);

		if (directResult.rowCount === 0) {
			const error = new Error('Direct request not found');
			error.statusCode = 404;
			throw error;
		}

		const directDetail = directResult.rows[0];

		if (directDetail.target_worker_account_id !== workerAccountId) {
			const error = new Error('Forbidden: You are not the targeted worker for this request');
			error.statusCode = 403;
			throw error;
		}

		if (directDetail.response_status !== 'pending') {
			const error = new Error(`Direct request has already been responded to (${directDetail.response_status})`);
			error.statusCode = 400;
			throw error;
		}

		const newStatus = action === 'accept' ? 'accepted' : 'rejected';

		// 2. Update direct_request_details
		await client.query(
			`UPDATE direct_request_details
			 SET response_status = $1, response_note = $2, responded_at = NOW(), updated_at = NOW()
			 WHERE request_id = $3`,
			[newStatus, note || null, requestId]
		);

		// 3. Update requests table
		if (action === 'accept') {
			await client.query(
				`UPDATE requests
				 SET status = 'accepted', assigned_worker_account_id = $1, updated_at = NOW()
				 WHERE id = $2`,
				[workerAccountId, requestId]
			);
		} else {
			await client.query(
				`UPDATE requests
				 SET status = 'rejected', updated_at = NOW()
				 WHERE id = $1`,
				[requestId]
			);
		}

		if (action === 'reject') {
			await releaseScheduleSlot(client, requestId);
		}

		// 4. Audit trail
		await client.query(
			`INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
			 VALUES ($1, $2, $3, $4, $5)`,
			[
				requestId,
				directDetail.current_request_status,
				newStatus,
				workerAccountId,
				note || `Direct request ${newStatus} by worker`,
			]
		);

		await client.query('COMMIT');

		// Emit real-time notifications to requester
		sendNotification(directDetail.user_account_id, 'notification:direct_response', {
			request_id: requestId,
			action,
			status: newStatus,
			worker_account_id: workerAccountId,
			note: note || null,
			responded_at: new Date().toISOString(),
		});

		emitToJobRoom(requestId, 'job:status_updated', {
			request_id: requestId,
			new_status: newStatus,
			assigned_worker_account_id: action === 'accept' ? workerAccountId : null,
			note: note || `Direct request ${newStatus} by worker`,
		});

		return {
			message: `Direct request ${newStatus} successfully`,
			request_id: requestId,
			status: newStatus,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function updateJobStatus(workerAccountId, requestId, { status, note }) {
	const client = await pool.connect();
	const allowedStatuses = ['in_progress', 'completed', 'cancelled'];
	const normalizedStatus = String(status || '').toLowerCase();

	if (!allowedStatuses.includes(normalizedStatus)) {
		const error = new Error('status must be in_progress, completed, or cancelled');
		error.statusCode = 400;
		throw error;
	}

	try {
		await client.query('BEGIN');

		const requestResult = await client.query(
			`SELECT id, user_account_id, assigned_worker_account_id, status FROM requests WHERE id = $1 LIMIT 1 FOR UPDATE`,
			[requestId]
		);

		if (requestResult.rowCount === 0) {
			const error = new Error('Request not found');
			error.statusCode = 404;
			throw error;
		}

		const request = requestResult.rows[0];

		if (request.assigned_worker_account_id !== workerAccountId) {
			const error = new Error('Forbidden: You are not the assigned worker for this job');
			error.statusCode = 403;
			throw error;
		}

		// State transition validation
		if (normalizedStatus === 'in_progress' && request.status !== 'accepted') {
			const error = new Error(`Cannot start job from current status: ${request.status}. Job must be in accepted status.`);
			error.statusCode = 400;
			throw error;
		}

		if (normalizedStatus === 'completed' && request.status !== 'in_progress') {
			const error = new Error(`Cannot complete job from current status: ${request.status}. Job must be in_progress first.`);
			error.statusCode = 400;
			throw error;
		}

		// Update request status
		const updateResult = await client.query(
			`UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
			[normalizedStatus, requestId]
		);

		// Record status history
		await client.query(
			`INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
			 VALUES ($1, $2, $3, $4, $5)`,
			[requestId, request.status, normalizedStatus, workerAccountId, note || `Job status updated to ${normalizedStatus}`]
		);

		if (normalizedStatus === 'cancelled') {
			await releaseScheduleSlot(client, requestId);
		}

		await client.query('COMMIT');

		const updatedJob = updateResult.rows[0];

		// Emit real-time notifications
		sendNotification(request.user_account_id, 'job:status_updated', {
			request_id: requestId,
			new_status: normalizedStatus,
			changed_by: workerAccountId,
			note: note || `Job status updated to ${normalizedStatus}`,
			updated_at: updatedJob.updated_at,
		});

		emitToJobRoom(requestId, 'job:status_updated', {
			request_id: requestId,
			new_status: normalizedStatus,
			changed_by: workerAccountId,
			note: note || `Job status updated to ${normalizedStatus}`,
			updated_at: updatedJob.updated_at,
		});

		return updatedJob;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function getUserRequests(userAccountId) {
	const query = `
		SELECT 
			r.id,
			r.request_type,
			r.title,
			r.description,
			r.location,
			r.status,
			r.assigned_worker_account_id,
			w.full_name AS assigned_worker_name,
			r.created_at,
			r.updated_at
		FROM requests r
		LEFT JOIN accounts w ON r.assigned_worker_account_id = w.id
		WHERE r.user_account_id = $1
		ORDER BY r.created_at DESC
	`;

	const result = await pool.query(query, [userAccountId]);
	return result.rows;
}

async function getRequestById(requestId) {
	const requestResult = await pool.query(
		`SELECT 
			r.id,
			r.user_account_id,
			u.full_name AS requester_name,
			u.email AS requester_email,
			r.request_type,
			r.title,
			r.description,
			r.location,
			r.status,
			r.assigned_worker_account_id,
			w.full_name AS assigned_worker_name,
			r.created_at,
			r.updated_at
		 FROM requests r
		 JOIN accounts u ON r.user_account_id = u.id
		 LEFT JOIN accounts w ON r.assigned_worker_account_id = w.id
		 WHERE r.id = $1 LIMIT 1`,
		[requestId]
	);

	if (requestResult.rowCount === 0) {
		const error = new Error('Request not found');
		error.statusCode = 404;
		throw error;
	}

	const request = requestResult.rows[0];

	if (request.request_type === 'direct') {
		const directRes = await pool.query(
			`SELECT target_worker_account_id, budget, urgency, preferred_start, preferred_end, response_status, response_note, responded_at FROM direct_request_details WHERE request_id = $1 LIMIT 1`,
			[requestId]
		);
		request.direct_details = directRes.rows[0] || null;
	}

	const historyRes = await pool.query(
		`SELECT id, from_status, to_status, changed_by_account_id, note, changed_at FROM request_status_history WHERE request_id = $1 ORDER BY changed_at ASC`,
		[requestId]
	);
	request.status_history = historyRes.rows;

	return request;
}

async function getOpenRequests(options = {}) {
	const { location, search, limit = 50, offset = 0 } = options;

	let sql = `
		SELECT 
			r.id,
			r.user_account_id,
			u.full_name AS requester_name,
			r.request_type,
			r.title,
			r.description,
			r.location,
			r.status,
			r.created_at,
			r.updated_at,
			(SELECT COUNT(*)::INT FROM bids b WHERE b.request_id = r.id AND b.status = 'active') AS bid_count
		FROM requests r
		JOIN accounts u ON r.user_account_id = u.id
		WHERE r.request_type = 'open' AND r.status = 'pending'
	`;

	const params = [];
	let paramIdx = 1;

	if (location) {
		sql += ` AND r.location ILIKE $${paramIdx++}`;
		params.push(`%${location}%`);
	}

	if (search) {
		sql += ` AND (r.title ILIKE $${paramIdx} OR r.description ILIKE $${paramIdx})`;
		paramIdx++;
		params.push(`%${search}%`);
	}

	sql += ` ORDER BY r.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
	params.push(parseInt(limit, 10), parseInt(offset, 10));

	const result = await pool.query(sql, params);
	return result.rows;
}

async function cancelRequestByUser(userAccountId, requestId, note) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const requestResult = await client.query(
			`SELECT id, user_account_id, status FROM requests WHERE id = $1 LIMIT 1 FOR UPDATE`,
			[requestId]
		);

		if (requestResult.rowCount === 0) {
			const error = new Error('Request not found');
			error.statusCode = 404;
			throw error;
		}

		const request = requestResult.rows[0];

		if (request.user_account_id !== userAccountId) {
			const error = new Error('Forbidden: You can only cancel requests you created');
			error.statusCode = 403;
			throw error;
		}

		if (['completed', 'cancelled'].includes(request.status)) {
			const error = new Error(`Cannot cancel request in status: ${request.status}`);
			error.statusCode = 400;
			throw error;
		}

		const updateResult = await client.query(
			`UPDATE requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
			[requestId]
		);

		await client.query(
			`INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
			 VALUES ($1, $2, 'cancelled', $3, $4)`,
			[requestId, request.status, userAccountId, note || 'Request cancelled by user']
		);

		await releaseScheduleSlot(client, requestId);

		await client.query('COMMIT');

		const cancelledJob = updateResult.rows[0];

		emitToJobRoom(requestId, 'job:status_updated', {
			request_id: requestId,
			new_status: 'cancelled',
			changed_by: userAccountId,
			note: note || 'Request cancelled by user',
			updated_at: cancelledJob.updated_at,
		});

		return cancelledJob;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

module.exports = {
	createRequest,
	getIncomingDirectRequests,
	respondToDirectRequest,
	updateJobStatus,
	getUserRequests,
	getRequestById,
	getOpenRequests,
	cancelRequestByUser,
};
