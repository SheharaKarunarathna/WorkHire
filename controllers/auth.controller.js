const authService = require('../services/auth.service');

async function register(req, res, next) {
	try {
		const user = await authService.register(req.body);

		return res.status(201).json({
			message: 'Registration successful',
			user,
		});
	} catch (error) {
		if (error.code === '23505') {
			return res.status(409).json({ error: 'Email already exists' });
		}

		next(error);
	}
}

module.exports = {
	register,
};