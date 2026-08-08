const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const { validateCreateReview } = require('../middleware/validateReview');
const { createReview, getWorkerReviews } = require('../controllers/review.controller');

const router = express.Router();

router.post('/', authenticateToken, authorizeRoles(['user']), validateCreateReview, createReview);
router.get('/worker/:workerId', getWorkerReviews);

module.exports = router;
