const authService = require('../services/auth.service');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Token factories
// ---------------------------------------------------------------------------

function createAccessToken(user) {
	const roles = Array.isArray(user.roles)
		? user.roles
		: typeof user.roles === 'string'
			? user.roles.replace(/[{}]/g, '').split(',').map((role) => role.trim()).filter(Boolean)
			: [];

	const payload = {
		sub: user.id,
		email: user.email,
		roles: roles.map((role) => String(role).toLowerCase()),
	};

	return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
	});
}

function createRefreshToken() {
	// 64 random bytes → hex string (128 chars). Opaque, not a JWT.
	return crypto.randomBytes(64).toString('hex');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the refresh token from the httpOnly cookie */
function getRefreshTokenFromCookie(req) {
	return req.cookies?.refreshToken ?? null;
}

/** Set the refresh token as a secure httpOnly cookie */
function setRefreshTokenCookie(res, rawToken) {
	const maxAgeMs = parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
	res.cookie('refreshToken', rawToken, {
		httpOnly: true,   // not accessible via JS — protects from XSS
		secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
		sameSite: 'strict',
		maxAge: maxAgeMs,
		path: '/auth',    // cookie only sent to /auth/* routes
	});
}

function clearRefreshTokenCookie(res) {
	res.clearCookie('refreshToken', { path: '/auth' });
}

function parseDurationMs(str) {
	const match = str.match(/^(\d+)([smhd])$/);
	if (!match) throw new Error(`Invalid duration format: ${str}`);
	const value = parseInt(match[1], 10);
	const unit = match[2];
	const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
	return value * multipliers[unit];
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function register(req, res, next) {
	try {
		const user = await authService.register(req.body);
		const accessToken = createAccessToken(user);
		const rawRefreshToken = createRefreshToken();

		await authService.saveRefreshToken(user.id, rawRefreshToken);
		setRefreshTokenCookie(res, rawRefreshToken);

		return res.status(201).json({
			message: 'Registration successful',
			user,
			accessToken,
		});
	} catch (error) {
		if (error.code === '23505') {
			return res.status(409).json({ error: 'Email already exists' });
		}
		next(error);
	}
}

async function login(req, res, next) {
	try {
		const user = await authService.login(req.body);
		const accessToken = createAccessToken(user);
		const rawRefreshToken = createRefreshToken();

		await authService.saveRefreshToken(user.id, rawRefreshToken);
		setRefreshTokenCookie(res, rawRefreshToken);

		return res.status(200).json({
			message: 'Login successful',
			user,
			accessToken,
		});
	} catch (error) {
		next(error);
	}
}

async function refresh(req, res, next) {
	try {
		const rawToken = getRefreshTokenFromCookie(req);

		if (!rawToken) {
			return res.status(401).json({ error: 'No refresh token provided' });
		}

		// Rotate: revoke old token, get account details
		const user = await authService.rotateRefreshToken(rawToken);

		// Issue brand-new pair
		const newAccessToken = createAccessToken(user);
		const newRawRefreshToken = createRefreshToken();

		await authService.saveRefreshToken(user.id, newRawRefreshToken);
		setRefreshTokenCookie(res, newRawRefreshToken);

		return res.status(200).json({
			message: 'Token refreshed',
			accessToken: newAccessToken,
		});
	} catch (error) {
		if (error.statusCode === 401) {
			clearRefreshTokenCookie(res);
			return res.status(401).json({ error: error.message });
		}
		next(error);
	}
}

async function logout(req, res, next) {
	try {
		const rawToken = getRefreshTokenFromCookie(req);

		if (rawToken) {
			await authService.revokeRefreshToken(rawToken);
		}

		clearRefreshTokenCookie(res);

		return res.status(200).json({ message: 'Logged out successfully' });
	} catch (error) {
		next(error);
	}
}

async function createOperator(req, res, next) {
	try {
		const operator = await authService.createOperator(req.body);
		return res.status(201).json({
			message: 'Operator account created',
			user: operator,
		});
	} catch (error) {
		if (error.code === '23505') {
			return res.status(409).json({ error: 'Email already exists' });
		}
		next(error);
	}
}

function me(req, res) {
	return res.status(200).json({ user: req.user });
}

module.exports = {
	register,
	login,
	refresh,
	logout,
	me,
	createOperator,
};
