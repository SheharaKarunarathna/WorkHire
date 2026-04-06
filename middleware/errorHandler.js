function errorHandler(err, req, res, next) {
	if (res.headersSent) {
		return next(err);
	}

	console.error(err);

	const statusCode = err.statusCode || 500;
	const message = err.message || 'Internal server error';

	return res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;