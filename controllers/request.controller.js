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

async function getIncomingDirectRequests(req, res, next) {
	try {
		const requests = await requestService.getIncomingDirectRequests(req.user.sub);
		return res.status(200).json({ requests });
	} catch (error) {
		next(error);
	}
}

async function respondDirectRequest(req, res, next) {
	try {
		const { action, note } = req.body;

		if (!action || !['accept', 'reject'].includes(String(action).toLowerCase())) {
			return res.status(400).json({ error: 'action must be either accept or reject' });
		}

		const result = await requestService.respondToDirectRequest(
			req.user.sub,
			req.params.requestId,
			{ action: String(action).toLowerCase(), note }
		);

		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

async function updateJobStatus(req, res, next) {
	try {
		const updatedRequest = await requestService.updateJobStatus(
			req.user.sub,
			req.params.requestId,
			req.body
		);

		return res.status(200).json({
			message: 'Job status updated successfully',
			request: updatedRequest,
		});
	} catch (error) {
		next(error);
	}
}

async function getMyRequests(req, res, next) {
	try {
		const requests = await requestService.getUserRequests(req.user.sub);
		return res.status(200).json({ requests });
	} catch (error) {
		next(error);
	}
}

async function getRequestById(req, res, next) {
	try {
		const request = await requestService.getRequestById(req.params.requestId);
		return res.status(200).json({ request });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	createRequest,
	getIncomingDirectRequests,
	respondDirectRequest,
	updateJobStatus,
	getMyRequests,
	getRequestById,
};
