const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authToken');
const validateTrade = require('../validators/tradeValidator');
const { getPortfolio, executeTrade, getTransactions } = require('../controllers/portfolioController');

router.get('/', requireAuth, getPortfolio);
router.post('/trade', requireAuth, validateTrade, executeTrade);
router.get('/transactions', requireAuth, getTransactions);

module.exports = router;
