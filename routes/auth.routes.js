const express = require('express');
const { register, login, me } = require('../controllers/auth.controller');
const validateRegister = require('../middleware/validateRegister');
const validateLogin = require('../middleware/validateLogin');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticateToken, me);

module.exports = router;