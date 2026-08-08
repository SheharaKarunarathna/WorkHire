const reviewService = require('../services/review.service');

async function createReview(req, res, next) {
	try {
		const review = await reviewService.createReview(req.user.sub, req.body);
		return res.status(201).json({
			message: 'Review submitted successfully',
			review,
		});
	} catch (error) {
		next(error);
	}
}

async function getWorkerReviews(req, res, next) {
	try {
		const reviews = await reviewService.getWorkerReviews(req.params.workerId);
		return res.status(200).json({ reviews });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	createReview,
	getWorkerReviews,
};
