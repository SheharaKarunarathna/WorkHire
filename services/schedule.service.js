const pool = require('../db');

async function createScheduleSlot(workerAccountId, { slot_date, start_time, end_time, time_zone }) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// 1. Verify worker profile existence and verification status
		const workerRes = await client.query(
			`SELECT verification_status FROM worker_profiles WHERE account_id = $1 LIMIT 1`,
			[workerAccountId]
		);

		if (workerRes.rowCount === 0) {
			const error = new Error('Worker profile not found');
			error.statusCode = 403;
			throw error;
		}

		if (workerRes.rows[0].verification_status !== 'verified') {
			const error = new Error('Worker identity must be verified before creating schedule slots');
			error.statusCode = 403;
			throw error;
		}

		// 2. Check for overlapping slots for this worker on the same date
		const overlapRes = await client.query(
			`SELECT id FROM worker_schedules
			 WHERE worker_account_id = $1
			   AND slot_date = $2
			   AND (start_time, end_time) OVERLAPS ($3::time, $4::time)
			 LIMIT 1`,
			[workerAccountId, slot_date, start_time, end_time]
		);

		if (overlapRes.rowCount > 0) {
			const error = new Error('Schedule slot overlaps with an existing slot for this date');
			error.statusCode = 400;
			throw error;
		}

		// 3. Insert new schedule slot
		const insertRes = await client.query(
			`INSERT INTO worker_schedules (
				worker_account_id,
				slot_date,
				start_time,
				end_time,
				time_zone
			 ) VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, worker_account_id, slot_date, start_time, end_time, time_zone, is_booked, booked_request_id, created_at, updated_at`,
			[workerAccountId, slot_date, start_time, end_time, time_zone || 'UTC']
		);

		await client.query('COMMIT');
		return insertRes.rows[0];
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function getWorkerSchedules(workerAccountId, options = {}) {
	const { date, available_only } = options;

	let sql = `
		SELECT 
			id,
			worker_account_id,
			slot_date,
			start_time,
			end_time,
			time_zone,
			is_booked,
			booked_request_id,
			created_at,
			updated_at
		FROM worker_schedules
		WHERE worker_account_id = $1
	`;

	const params = [workerAccountId];
	let paramIdx = 2;

	if (date) {
		sql += ` AND slot_date = $${paramIdx++}`;
		params.push(date);
	}

	if (available_only === 'true' || available_only === true) {
		sql += ` AND is_booked = FALSE`;
	}

	sql += ` ORDER BY slot_date ASC, start_time ASC`;

	const result = await pool.query(sql, params);
	return result.rows;
}

async function deleteScheduleSlot(workerAccountId, slotId) {
	const slotRes = await pool.query(
		`SELECT id, worker_account_id, is_booked FROM worker_schedules WHERE id = $1 LIMIT 1`,
		[slotId]
	);

	if (slotRes.rowCount === 0) {
		const error = new Error('Schedule slot not found');
		error.statusCode = 404;
		throw error;
	}

	const slot = slotRes.rows[0];

	if (slot.worker_account_id !== workerAccountId) {
		const error = new Error('Forbidden: You can only delete your own schedule slots');
		error.statusCode = 403;
		throw error;
	}

	if (slot.is_booked) {
		const error = new Error('Cannot delete a booked schedule slot');
		error.statusCode = 400;
		throw error;
	}

	await pool.query(`DELETE FROM worker_schedules WHERE id = $1`, [slotId]);
	return { message: 'Schedule slot deleted successfully', id: slotId };
}

async function bookScheduleSlot(client, slotId, requestId, targetWorkerAccountId = null) {
	const slotRes = await client.query(
		`SELECT id, worker_account_id, is_booked FROM worker_schedules WHERE id = $1 FOR UPDATE`,
		[slotId]
	);

	if (slotRes.rowCount === 0) {
		const error = new Error('Selected schedule slot not found');
		error.statusCode = 404;
		throw error;
	}

	const slot = slotRes.rows[0];

	if (slot.is_booked) {
		const error = new Error('Selected schedule slot is already booked');
		error.statusCode = 400;
		throw error;
	}

	if (targetWorkerAccountId && slot.worker_account_id !== targetWorkerAccountId) {
		const error = new Error('Selected schedule slot does not belong to the targeted worker');
		error.statusCode = 400;
		throw error;
	}

	const updateRes = await client.query(
		`UPDATE worker_schedules
		 SET is_booked = TRUE, booked_request_id = $1, updated_at = NOW()
		 WHERE id = $2
		 RETURNING *`,
		[requestId, slotId]
	);

	return updateRes.rows[0];
}

async function releaseScheduleSlot(client, requestId) {
	const updateRes = await client.query(
		`UPDATE worker_schedules
		 SET is_booked = FALSE, booked_request_id = NULL, updated_at = NOW()
		 WHERE booked_request_id = $1
		 RETURNING *`,
		[requestId]
	);

	return updateRes.rows;
}

module.exports = {
	createScheduleSlot,
	getWorkerSchedules,
	deleteScheduleSlot,
	bookScheduleSlot,
	releaseScheduleSlot,
};
