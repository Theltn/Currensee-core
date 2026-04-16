const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authToken');
const { getPortfolio, executeTrade, getTransactions } = require('../controllers/portfolioController');

router.get('/', requireAuth, getPortfolio);
router.post('/trade', requireAuth, executeTrade);
router.get('/transactions', requireAuth, getTransactions);

module.exports = router;
