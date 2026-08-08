const pool = require('../db');

async function placeBid(workerAccountId, { request_id, amount, message }) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// 1. Verify worker profile existence and verification status
		const workerResult = await client.query(
			`SELECT verification_status FROM worker_profiles WHERE account_id = $1 LIMIT 1`,
			[workerAccountId]
		);

		if (workerResult.rowCount === 0) {
			const error = new Error('Worker profile not found');
			error.statusCode = 403;
			throw error;
		}

		if (workerResult.rows[0].verification_status !== 'verified') {
			const error = new Error('Worker identity must be verified before placing bids');
			error.statusCode = 403;
			throw error;
		}

		// 2. Fetch target request
		const requestResult = await client.query(
			`SELECT id, request_type, status, user_account_id FROM requests WHERE id = $1 LIMIT 1`,
			[request_id]
		);

		if (requestResult.rowCount === 0) {
			const error = new Error('Request not found');
			error.statusCode = 404;
			throw error;
		}

		const targetRequest = requestResult.rows[0];

		if (targetRequest.request_type !== 'open') {
			const error = new Error('Bids are allowed only for open requests');
			error.statusCode = 400;
			throw error;
		}

		if (targetRequest.status !== 'pending') {
			const error = new Error('Bids can only be placed on pending requests');
			error.statusCode = 400;
			throw error;
		}

		if (targetRequest.user_account_id === workerAccountId) {
			const error = new Error('Requesters cannot place bids on their own requests');
			error.statusCode = 400;
			throw error;
		}

		// 3. Check for existing active/accepted bid by this worker on this request
		const existingBidResult = await client.query(
			`SELECT id FROM bids WHERE request_id = $1 AND worker_account_id = $2 AND status IN ('active', 'accepted') LIMIT 1`,
			[request_id, workerAccountId]
		);

		if (existingBidResult.rowCount > 0) {
			const error = new Error('You already have an active bid on this request');
			error.statusCode = 400;
			throw error;
		}

		// 4. Insert bid
		const insertBidResult = await client.query(
			`INSERT INTO bids (request_id, worker_account_id, amount, message, status)
			 VALUES ($1, $2, $3, $4, 'active')
			 RETURNING id, request_id, worker_account_id, amount, message, status, created_at, updated_at`,
			[request_id, workerAccountId, amount, message || null]
		);

		await client.query('COMMIT');
		return insertBidResult.rows[0];
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function getBidsForRequest(requesterAccountId, requestId) {
	const requestResult = await pool.query(
		`SELECT id, user_account_id, request_type FROM requests WHERE id = $1 LIMIT 1`,
		[requestId]
	);

	if (requestResult.rowCount === 0) {
		const error = new Error('Request not found');
		error.statusCode = 404;
		throw error;
	}

	const bidsResult = await pool.query(
		`SELECT 
			b.id,
			b.request_id,
			b.worker_account_id,
			b.amount,
			b.message,
			b.status,
			b.created_at,
			b.updated_at,
			a.full_name AS worker_name,
			a.email AS worker_email,
			wp.verification_status,
			wp.avg_rating,
			wp.ratings_count
		 FROM bids b
		 JOIN accounts a ON b.worker_account_id = a.id
		 LEFT JOIN worker_profiles wp ON a.id = wp.account_id
		 WHERE b.request_id = $1
		 ORDER BY b.created_at ASC`,
		[requestId]
	);

	return bidsResult.rows;
}

async function getWorkerBids(workerAccountId) {
	const result = await pool.query(
		`SELECT 
			b.id,
			b.request_id,
			b.amount,
			b.message,
			b.status,
			b.created_at,
			b.updated_at,
			r.title AS request_title,
			r.location AS request_location,
			r.status AS request_status
		 FROM bids b
		 JOIN requests r ON b.request_id = r.id
		 WHERE b.worker_account_id = $1
		 ORDER BY b.created_at DESC`,
		[workerAccountId]
	);

	return result.rows;
}

async function withdrawBid(workerAccountId, bidId) {
	const bidResult = await pool.query(
		`SELECT id, worker_account_id, status FROM bids WHERE id = $1 LIMIT 1`,
		[bidId]
	);

	if (bidResult.rowCount === 0) {
		const error = new Error('Bid not found');
		error.statusCode = 404;
		throw error;
	}

	const bid = bidResult.rows[0];

	if (bid.worker_account_id !== workerAccountId) {
		const error = new Error('Forbidden: You can only withdraw your own bids');
		error.statusCode = 403;
		throw error;
	}

	if (bid.status !== 'active') {
		const error = new Error(`Only active bids can be withdrawn. Current status: ${bid.status}`);
		error.statusCode = 400;
		throw error;
	}

	const updateResult = await pool.query(
		`UPDATE bids 
		 SET status = 'withdrawn', updated_at = NOW() 
		 WHERE id = $1 
		 RETURNING id, request_id, worker_account_id, amount, status, updated_at`,
		[bidId]
	);

	return updateResult.rows[0];
}

async function acceptBid(userAccountId, requestId, bidId) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// 1. Verify request ownership & status
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
			const error = new Error('Forbidden: You can only accept bids for requests you created');
			error.statusCode = 403;
			throw error;
		}

		if (request.status !== 'pending') {
			const error = new Error(`Only pending requests can accept bids. Current status: ${request.status}`);
			error.statusCode = 400;
			throw error;
		}

		// 2. Verify target bid
		const bidResult = await client.query(
			`SELECT id, worker_account_id, status FROM bids WHERE id = $1 AND request_id = $2 LIMIT 1 FOR UPDATE`,
			[bidId, requestId]
		);

		if (bidResult.rowCount === 0) {
			const error = new Error('Bid not found on this request');
			error.statusCode = 404;
			throw error;
		}

		const winningBid = bidResult.rows[0];

		if (winningBid.status !== 'active') {
			const error = new Error(`Only active bids can be accepted. Target bid status: ${winningBid.status}`);
			error.statusCode = 400;
			throw error;
		}

		// 3. Mark all other active bids for this request as rejected
		await client.query(
			`UPDATE bids SET status = 'rejected', updated_at = NOW() WHERE request_id = $1 AND id <> $2 AND status = 'active'`,
			[requestId, bidId]
		);

		// 4. Mark winning bid as accepted
		const acceptedBidResult = await client.query(
			`UPDATE bids SET status = 'accepted', updated_at = NOW() WHERE id = $1 RETURNING id, request_id, worker_account_id, amount, status, updated_at`,
			[bidId]
		);

		// 5. Update request status & assigned worker
		await client.query(
			`UPDATE requests SET assigned_worker_account_id = $1, status = 'accepted', updated_at = NOW() WHERE id = $2`,
			[winningBid.worker_account_id, requestId]
		);

		// 6. Record status history
		await client.query(
			`INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
			 VALUES ($1, 'pending', 'accepted', $2, $3)`,
			[requestId, userAccountId, `Accepted bid ${bidId}`]
		);

		await client.query('COMMIT');

		return {
			message: 'Bid accepted successfully',
			accepted_bid: acceptedBidResult.rows[0],
			assigned_worker_account_id: winningBid.worker_account_id,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

module.exports = {
	placeBid,
	getBidsForRequest,
	getWorkerBids,
	withdrawBid,
	acceptBid,
};
