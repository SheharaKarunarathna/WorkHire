const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Missing or invalid Authorization header' });
	}

	const token = authHeader.slice(7).trim();

	try {
		const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		req.user = payload;
		return next();
	} catch (error) {
		return res.status(401).json({ error: 'Invalid or expired token' });
	}
}

module.exports = authenticateToken;
