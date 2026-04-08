const bcrypt = require('bcryptjs');
const pool = require('../db');

async function createAccountWithRole(client, { full_name, email, password, phone, role }) {
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
		`INSERT INTO account_roles (account_id, role) VALUES ($1, $2)`,
		[accountId, role]
	);

	return {
		...accountResult.rows[0],
		roles: [role],
	};
}

async function register({ full_name, email, password, phone, role }) {
	const client = await pool.connect();
	const normalizedRole = String(role || '').toLowerCase();
	const allowedRoles = ['user', 'worker'];

	if (!allowedRoles.includes(normalizedRole)) {
		const error = new Error('role must be either user or worker');
		error.statusCode = 400;
		throw error;
	}

	try {
		await client.query('BEGIN');

		const account = await createAccountWithRole(client, {
			full_name,
			email,
			password,
			phone,
			role: normalizedRole,
		});

		await client.query('COMMIT');

		return account;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function createOperator({ full_name, email, password, phone }) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const operatorAccount = await createAccountWithRole(client, {
			full_name,
			email,
			password,
			phone,
			role: 'operator',
		});

		await client.query(
			`INSERT INTO operator_profiles (account_id) VALUES ($1)`,
			[operatorAccount.id]
		);

		await client.query('COMMIT');

		return operatorAccount;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function login({ email, password }) {
	const findAccountQuery = `
		SELECT
			a.id,
			a.full_name,
			a.email,
			a.phone,
			a.is_active,
			a.created_at,
			a.password_hash,
			COALESCE(
				ARRAY_AGG(ar.role) FILTER (WHERE ar.role IS NOT NULL),
				ARRAY[]::account_role[]
			) AS roles 
		FROM accounts a
		LEFT JOIN account_roles ar ON ar.account_id = a.id
		WHERE a.email = $1
		GROUP BY a.id
	`;

	const result = await pool.query(findAccountQuery, [email]); // This executes the query and returns a result object. If no rows are found, result.rowCount will be 0.

	if (result.rowCount === 0) {
		const error = new Error('Invalid email or password');
		error.statusCode = 401;
		throw error;
	}

	const account = result.rows[0];
	const isPasswordValid = await bcrypt.compare(password, account.password_hash);

	if (!isPasswordValid) {
		const error = new Error('Invalid email or password');
		error.statusCode = 401;
		throw error;
	}

	if (!account.is_active) {
		const error = new Error('Account is inactive');
		error.statusCode = 403;
		throw error;
	}

	const { password_hash, ...safeAccount } = account;
	return safeAccount;
}

module.exports = {
	register,
	login,
	createOperator,
};