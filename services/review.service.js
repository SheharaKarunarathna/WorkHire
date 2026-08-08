const pool = require('../db');

async function createReview(userAccountId, { request_id, rating, review_text }) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// 1. Fetch request details
		const requestResult = await client.query(
			`SELECT id, user_account_id, assigned_worker_account_id, status FROM requests WHERE id = $1 LIMIT 1 FOR UPDATE`,
			[request_id]
		);

		if (requestResult.rowCount === 0) {
			const error = new Error('Request not found');
			error.statusCode = 404;
			throw error;
		}

		const request = requestResult.rows[0];

		if (request.user_account_id !== userAccountId) {
			const error = new Error('Forbidden: You can only submit reviews for requests you created');
			error.statusCode = 403;
			throw error;
		}

		if (request.status !== 'completed') {
			const error = new Error(`Only completed jobs can be reviewed. Current request status: ${request.status}`);
			error.statusCode = 400;
			throw error;
		}

		if (!request.assigned_worker_account_id) {
			const error = new Error('Request does not have an assigned worker');
			error.statusCode = 400;
			throw error;
		}

		const workerAccountId = request.assigned_worker_account_id;

		// 2. Check for duplicate review
		const existingReviewResult = await client.query(
			`SELECT id FROM reviews WHERE request_id = $1 LIMIT 1`,
			[request_id]
		);

		if (existingReviewResult.rowCount > 0) {
			const error = new Error('A review has already been submitted for this request');
			error.statusCode = 400;
			throw error;
		}

		// 3. Insert review
		const insertReviewResult = await client.query(
			`INSERT INTO reviews (request_id, user_account_id, worker_account_id, rating, review_text)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, request_id, user_account_id, worker_account_id, rating, review_text, created_at`,
			[request_id, userAccountId, workerAccountId, rating, review_text || null]
		);

		// 4. Recalculate worker rating stats
		const statsResult = await client.query(
			`SELECT COALESCE(AVG(rating), 0)::NUMERIC(3, 2) AS new_avg, COUNT(*)::INT AS new_count
			 FROM reviews WHERE worker_account_id = $1`,
			[workerAccountId]
		);

		const { new_avg, new_count } = statsResult.rows[0];

		await client.query(
			`UPDATE worker_profiles
			 SET avg_rating = $1, ratings_count = $2, updated_at = NOW()
			 WHERE account_id = $3`,
			[new_avg, new_count, workerAccountId]
		);

		await client.query('COMMIT');

		return {
			...insertReviewResult.rows[0],
			worker_new_avg_rating: new_avg,
			worker_new_ratings_count: new_count,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function getWorkerReviews(workerAccountId) {
	const query = `
		SELECT 
			r.id,
			r.request_id,
			r.user_account_id,
			u.full_name AS reviewer_name,
			r.rating,
			r.review_text,
			r.created_at
		FROM reviews r
		JOIN accounts u ON r.user_account_id = u.id
		WHERE r.worker_account_id = $1
		ORDER BY r.created_at DESC
	`;

	const result = await pool.query(query, [workerAccountId]);
	return result.rows;
}

module.exports = {
	createReview,
	getWorkerReviews,
};
