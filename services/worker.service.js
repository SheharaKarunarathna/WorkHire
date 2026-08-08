const pool = require('../db');

async function getWorkerProfile(accountId) {
	const query = `
		SELECT 
			a.id,
			a.full_name,
			a.email,
			a.phone,
			wp.verification_status,
			wp.avg_rating,
			wp.ratings_count,
			wp.skills,
			wp.availability,
			wp.location,
			wp.bio,
			wp.hourly_rate,
			wp.created_at,
			wp.updated_at
		FROM accounts a
		JOIN worker_profiles wp ON a.id = wp.account_id
		WHERE a.id = $1 LIMIT 1
	`;

	const result = await pool.query(query, [accountId]);

	if (result.rowCount === 0) {
		const error = new Error('Worker profile not found');
		error.statusCode = 404;
		throw error;
	}

	return result.rows[0];
}

async function updateWorkerProfile(workerAccountId, { skills, availability, location, bio, hourly_rate }) {
	const updates = [];
	const values = [];
	let paramIdx = 1;

	if (skills !== undefined) {
		updates.push(`skills = $${paramIdx++}`);
		values.push(skills);
	}
	if (availability !== undefined) {
		updates.push(`availability = $${paramIdx++}`);
		values.push(availability);
	}
	if (location !== undefined) {
		updates.push(`location = $${paramIdx++}`);
		values.push(location);
	}
	if (bio !== undefined) {
		updates.push(`bio = $${paramIdx++}`);
		values.push(bio);
	}
	if (hourly_rate !== undefined) {
		updates.push(`hourly_rate = $${paramIdx++}`);
		values.push(hourly_rate);
	}

	if (updates.length === 0) {
		return getWorkerProfile(workerAccountId);
	}

	updates.push(`updated_at = NOW()`);
	values.push(workerAccountId);

	const sql = `
		UPDATE worker_profiles
		SET ${updates.join(', ')}
		WHERE account_id = $${paramIdx}
		RETURNING *
	`;

	await pool.query(sql, values);
	return getWorkerProfile(workerAccountId);
}

async function listWorkers({ skill, available_only }) {
	let sql = `
		SELECT 
			a.id,
			a.full_name,
			a.email,
			wp.verification_status,
			wp.avg_rating,
			wp.ratings_count,
			wp.skills,
			wp.availability,
			wp.location,
			wp.bio,
			wp.hourly_rate
		FROM accounts a
		JOIN worker_profiles wp ON a.id = wp.account_id
		WHERE a.is_active = TRUE AND wp.verification_status = 'verified'
	`;

	const params = [];
	let paramIdx = 1;

	if (skill) {
		sql += ` AND $${paramIdx++} = ANY(wp.skills)`;
		params.push(String(skill).toLowerCase());
	}

	if (available_only === 'true' || available_only === true) {
		sql += ` AND wp.availability = TRUE`;
	}

	sql += ` ORDER BY wp.avg_rating DESC, wp.ratings_count DESC, a.full_name ASC`;

	const result = await pool.query(sql, params);
	return result.rows;
}

module.exports = {
	getWorkerProfile,
	updateWorkerProfile,
	listWorkers,
};
