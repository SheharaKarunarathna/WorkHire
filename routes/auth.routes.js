const express = require('express');
const { register, login, me, createOperator } = require('../controllers/auth.controller');
const validateRegister = require('../middleware/validateRegister');
const validateLogin = require('../middleware/validateLogin');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const validateCreateOperator = require('../middleware/validateCreateOperator');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticateToken, me);
router.post('/operators', authenticateToken, authorizeRoles(['admin']), validateCreateOperator, createOperator);
module.exports = router;