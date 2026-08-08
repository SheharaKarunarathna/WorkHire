function isUuid(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function validateCreateReview(req, res, next) {
	const { request_id, rating, review_text } = req.body;

	if (!request_id || !isUuid(request_id)) {
		return res.status(400).json({ error: 'request_id is required and must be a valid UUID' });
	}

	if (rating === undefined || rating === null) {
		return res.status(400).json({ error: 'rating is required' });
	}

	const numericRating = Number(rating);
	if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
		return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
	}

	if (review_text !== undefined && review_text !== null) {
		if (typeof review_text !== 'string') {
			return res.status(400).json({ error: 'review_text must be a string when provided' });
		}
		if (review_text.length > 1000) {
			return res.status(400).json({ error: 'review_text cannot exceed 1000 characters' });
		}
	}

	req.body.rating = numericRating;
	next();
}

module.exports = {
	validateCreateReview,
};
