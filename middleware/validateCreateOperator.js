function validateCreateOperator(req, res, next) {
	const { full_name, email, password, phone } = req.body;

	if (!full_name || !email || !password || !phone) {
		return res.status(400).json({
			error: 'full_name, email, password, and phone are required',
		});
	}

	if (typeof password !== 'string' || password.length < 8) {
		return res.status(400).json({
			error: 'password must be at least 8 characters long',
		});
	}

	if (!/^\d{10}$/.test(String(phone))) {
		return res.status(400).json({
			error: 'phone must be exactly 10 digits',
		});
	}

	next();
}

module.exports = validateCreateOperator;
