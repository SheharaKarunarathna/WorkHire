const authService = require('../services/auth.service');
const jwt = require('jsonwebtoken');

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

async function register(req, res, next) {
	try {
		const user = await authService.register(req.body);
		const accessToken = createAccessToken(user);

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

		return res.status(200).json({
			message: 'Login successful',
			user,
			accessToken,
		});
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
	me,
	createOperator,
};