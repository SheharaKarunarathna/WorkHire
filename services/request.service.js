const pool = require('../db');

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

		await client.query(
			`INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_account_id, note)
			VALUES ($1, NULL, 'pending', $2, 'Request created')`,
			[createdRequest.id, userAccountId]
		);

		await client.query('COMMIT');

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

module.exports = {
	createRequest,
};
