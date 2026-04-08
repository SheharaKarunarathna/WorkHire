function validateRegister(req, res, next) {
	const { full_name, email, password, phone, role } = req.body;
	const normalizedRole = String(role || '').toLowerCase();
	const allowedRoles = ['user', 'worker'];

	if (!full_name || !email || !password || !phone || !role) {
		return res.status(400).json({
			error: 'full_name, email, password, phone, and role are required',
		});
	}

	if (!allowedRoles.includes(normalizedRole)) {
		return res.status(400).json({
			error: 'role must be either user or worker',
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

	req.body.role = normalizedRole;

	next(); // This next tag runs the register function in the auth.controller.js file if all validations pass
}

module.exports = validateRegister;