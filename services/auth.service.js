const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert a '7d' / '15m' string to milliseconds */
function parseDurationMs(str) {
	const match = str.match(/^(\d+)([smhd])$/);
	if (!match) throw new Error(`Invalid duration format: ${str}`);
	const value = parseInt(match[1], 10);
	const unit = match[2];
	const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
	return value * multipliers[unit];
}

/** SHA-256 hash a raw refresh token before DB storage */
function hashToken(rawToken) {
	return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// ---------------------------------------------------------------------------
// Shared account + role creation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

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

		// Create worker_profiles row so worker features work immediately
		if (normalizedRole === 'worker') {
			await client.query(
				`INSERT INTO worker_profiles (account_id) VALUES ($1)`,
				[account.id]
			);
		}

		await client.query('COMMIT');

		return account;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

// ---------------------------------------------------------------------------
// Create operator (admin only)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

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

	const result = await pool.query(findAccountQuery, [email]);

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

// ---------------------------------------------------------------------------
// Refresh token — save
// ---------------------------------------------------------------------------

async function saveRefreshToken(accountId, rawToken) {
	const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
	const expiresAt = new Date(Date.now() + parseDurationMs(expiresIn));
	const tokenHash = hashToken(rawToken);

	await pool.query(
		`INSERT INTO refresh_tokens (account_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		[accountId, tokenHash, expiresAt]
	);
}

// ---------------------------------------------------------------------------
// Refresh token — rotate (verify old, issue new)
// ---------------------------------------------------------------------------

async function rotateRefreshToken(rawToken) {
	const tokenHash = hashToken(rawToken);

	const result = await pool.query(
		`SELECT id, account_id, expires_at, revoked
		 FROM refresh_tokens
		 WHERE token_hash = $1`,
		[tokenHash]
	);

	if (result.rowCount === 0) {
		const error = new Error('Refresh token not found');
		error.statusCode = 401;
		throw error;
	}

	const stored = result.rows[0];

	if (stored.revoked) {
		const error = new Error('Refresh token has been revoked');
		error.statusCode = 401;
		throw error;
	}

	if (new Date(stored.expires_at) < new Date()) {
		const error = new Error('Refresh token has expired');
		error.statusCode = 401;
		throw error;
	}

	// Revoke the old token (token rotation — one-time use)
	await pool.query(
		`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`,
		[stored.id]
	);

	// Fetch the account to build new tokens
	const accountResult = await pool.query(
		`SELECT
			a.id,
			a.full_name,
			a.email,
			a.phone,
			a.is_active,
			COALESCE(
				ARRAY_AGG(ar.role) FILTER (WHERE ar.role IS NOT NULL),
				ARRAY[]::account_role[]
			) AS roles
		 FROM accounts a
		 LEFT JOIN account_roles ar ON ar.account_id = a.id
		 WHERE a.id = $1
		 GROUP BY a.id`,
		[stored.account_id]
	);

	if (accountResult.rowCount === 0 || !accountResult.rows[0].is_active) {
		const error = new Error('Account not found or inactive');
		error.statusCode = 401;
		throw error;
	}

	return accountResult.rows[0];
}

// ---------------------------------------------------------------------------
// Refresh token — revoke (logout)
// ---------------------------------------------------------------------------

async function revokeRefreshToken(rawToken) {
	const tokenHash = hashToken(rawToken);

	const result = await pool.query(
		`UPDATE refresh_tokens SET revoked = TRUE
		 WHERE token_hash = $1
		 RETURNING id`,
		[tokenHash]
	);

	// Silently succeed even if token wasn't found (idempotent logout)
	return result.rowCount > 0;
}

// ---------------------------------------------------------------------------

module.exports = {
	register,
	login,
	createOperator,
	saveRefreshToken,
	rotateRefreshToken,
	revokeRefreshToken,
};