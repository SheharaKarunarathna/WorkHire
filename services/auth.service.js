const bcrypt = require('bcryptjs');
const pool = require('../db');

async function register({ full_name, email, password, phone }) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const passwordHash = await bcrypt.hash(password, 12);

		const insertAccountQuery = `
			INSERT INTO accounts (full_name, email, password_hash, phone)
			VALUES ($1, $2, $3, $4)
			RETURNING id, full_name, email, phone, created_at
		`;

		const accountResult = await client.query(insertAccountQuery, [
			full_name,
			email,
			passwordHash,
			phone,
		]);

		const accountId = accountResult.rows[0].id;

		await client.query(
			`INSERT INTO account_roles (account_id, role) VALUES ($1, 'user')`,
			[accountId]
		);

		await client.query('COMMIT');

		return accountResult.rows[0];
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

module.exports = {
	register,
};