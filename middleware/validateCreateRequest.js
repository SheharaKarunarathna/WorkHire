function isUuid(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function validateCreateRequest(req, res, next) {
	const {
		request_type,
		title,
		description,
		location,
		target_worker_account_id,
		budget,
		urgency,
		preferred_start,
		preferred_end,
	} = req.body;

	const normalizedRequestType = String(request_type || '').toLowerCase();
	const allowedRequestTypes = ['open', 'direct'];

	if (!allowedRequestTypes.includes(normalizedRequestType)) {
		return res.status(400).json({
			error: 'request_type must be either open or direct',
		});
	}

	if (!title || !location) {
		return res.status(400).json({
			error: 'title and location are required',
		});
	}

	if (description !== undefined && description !== null && typeof description !== 'string') {
		return res.status(400).json({
			error: 'description must be a string when provided',
		});
	}

	if (normalizedRequestType === 'direct' && !isUuid(target_worker_account_id)) {
		return res.status(400).json({
			error: 'target_worker_account_id is required for direct requests and must be a valid UUID',
		});
	}

	if (normalizedRequestType === 'open' && target_worker_account_id) {
		return res.status(400).json({
			error: 'target_worker_account_id is only allowed for direct requests',
		});
	}

	if (budget !== undefined && budget !== null) {
		const numericBudget = Number(budget);
		if (!Number.isFinite(numericBudget) || numericBudget < 0) {
			return res.status(400).json({
				error: 'budget must be a non-negative number when provided',
			});
		}
	}

	if (urgency !== undefined && urgency !== null) {
		const normalizedUrgency = String(urgency).toLowerCase();
		if (!['low', 'medium', 'high'].includes(normalizedUrgency)) {
			return res.status(400).json({
				error: 'urgency must be low, medium, or high when provided',
			});
		}
		req.body.urgency = normalizedUrgency;
	}

	if (preferred_start && Number.isNaN(Date.parse(preferred_start))) {
		return res.status(400).json({
			error: 'preferred_start must be a valid datetime when provided',
		});
	}

	if (preferred_end && Number.isNaN(Date.parse(preferred_end))) {
		return res.status(400).json({
			error: 'preferred_end must be a valid datetime when provided',
		});
	}

	if (preferred_start && preferred_end) {
		const start = new Date(preferred_start).getTime();
		const end = new Date(preferred_end).getTime();

		if (end <= start) {
			return res.status(400).json({
				error: 'preferred_end must be later than preferred_start',
			});
		}

        // else if (start <= today.getTime()) {
        //     return res.status(400).json({
        //         error: 'preferred_start must not be a past datetime',
        //     });
        // }
	}





	req.body.request_type = normalizedRequestType;
	next();
}

module.exports = validateCreateRequest;



// worker ID f492ed3d-f96a-41e1-98ce-85f78e6ed62e