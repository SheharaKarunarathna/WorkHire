function authorizeRoles(allowedRoles) {
	return (req, res, next) => {
		const rawRoles = req.user?.roles;
		let tokenRoles = [];

		if (Array.isArray(rawRoles)) {
			tokenRoles = rawRoles;
		} else if (typeof rawRoles === 'string') {
			// Supports single role ("admin") and Postgres-like array strings ("{admin,operator}").
			tokenRoles = rawRoles
				.replace(/[{}]/g, '')
				.split(',')
				.map((role) => role.trim())
				.filter(Boolean);
		}

		const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase());
		const hasAllowedRole = tokenRoles.some((role) =>
			normalizedAllowedRoles.includes(String(role).toLowerCase())
		);

		if (!hasAllowedRole) {
			return res.status(403).json({ error: 'Forbidden: insufficient role' });
		}

		next();
	};
}

module.exports = authorizeRoles;
