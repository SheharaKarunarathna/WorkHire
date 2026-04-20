const requestService = require('../services/request.service');

async function createRequest(req, res, next) {
	try {
		const createdRequest = await requestService.createRequest(req.user.sub, req.body);

		return res.status(201).json({
			message: 'Request created successfully',
			request: createdRequest,
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	createRequest,
};
