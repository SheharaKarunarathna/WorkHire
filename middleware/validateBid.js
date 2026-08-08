function isUuid(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function validateCreateBid(req, res, next) {
	const { request_id, amount, message } = req.body;

	if (!request_id || !isUuid(request_id)) {
		return res.status(400).json({ error: 'request_id is required and must be a valid UUID' });
	}

	if (amount === undefined || amount === null) {
		return res.status(400).json({ error: 'amount is required' });
	}

	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 99999999.99) {
		return res.status(400).json({ error: 'amount must be a positive number up to 99,999,999.99' });
	}

	if (message !== undefined && message !== null) {
		if (typeof message !== 'string') {
			return res.status(400).json({ error: 'message must be a string when provided' });
		}
		if (message.length > 1000) {
			return res.status(400).json({ error: 'message cannot exceed 1000 characters' });
		}
	}

	req.body.amount = numericAmount;
	next();
}

function validateBidParams(req, res, next) {
	const { bidId, requestId } = req.params;

	if (bidId && !isUuid(bidId)) {
		return res.status(400).json({ error: 'bidId must be a valid UUID' });
	}

	if (requestId && !isUuid(requestId)) {
		return res.status(400).json({ error: 'requestId must be a valid UUID' });
	}

	next();
}

module.exports = {
	validateCreateBid,
	validateBidParams,
	isUuid,
};
