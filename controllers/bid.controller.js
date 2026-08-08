const bidService = require('../services/bid.service');

async function createBid(req, res, next) {
	try {
		const createdBid = await bidService.placeBid(req.user.sub, req.body);
		return res.status(201).json({
			message: 'Bid placed successfully',
			bid: createdBid,
		});
	} catch (error) {
		next(error);
	}
}

async function getBidsByRequest(req, res, next) {
	try {
		const bids = await bidService.getBidsForRequest(req.user.sub, req.params.requestId);
		return res.status(200).json({
			bids,
		});
	} catch (error) {
		next(error);
	}
}

async function getMyBids(req, res, next) {
	try {
		const bids = await bidService.getWorkerBids(req.user.sub);
		return res.status(200).json({
			bids,
		});
	} catch (error) {
		next(error);
	}
}

async function withdrawBid(req, res, next) {
	try {
		const withdrawnBid = await bidService.withdrawBid(req.user.sub, req.params.bidId);
		return res.status(200).json({
			message: 'Bid withdrawn successfully',
			bid: withdrawnBid,
		});
	} catch (error) {
		next(error);
	}
}

async function acceptBid(req, res, next) {
	try {
		const result = await bidService.acceptBid(
			req.user.sub,
			req.params.requestId,
			req.params.bidId
		);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	createBid,
	getBidsByRequest,
	getMyBids,
	withdrawBid,
	acceptBid,
};
