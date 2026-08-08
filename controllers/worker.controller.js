const workerService = require('../services/worker.service');

async function getMyProfile(req, res, next) {
	try {
		const profile = await workerService.getWorkerProfile(req.user.sub);
		return res.status(200).json({ profile });
	} catch (error) {
		next(error);
	}
}

async function updateProfile(req, res, next) {
	try {
		const updatedProfile = await workerService.updateWorkerProfile(req.user.sub, req.body);
		return res.status(200).json({
			message: 'Worker profile updated successfully',
			profile: updatedProfile,
		});
	} catch (error) {
		next(error);
	}
}

async function getAllWorkers(req, res, next) {
	try {
		const workers = await workerService.listWorkers(req.query);
		return res.status(200).json({ workers });
	} catch (error) {
		next(error);
	}
}

async function getWorkerById(req, res, next) {
	try {
		const profile = await workerService.getWorkerProfile(req.params.id);
		return res.status(200).json({ profile });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getMyProfile,
	updateProfile,
	getAllWorkers,
	getWorkerById,
};
