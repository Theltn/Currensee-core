const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authToken');
const { buyOption, listPositions, closePosition } = require('../controllers/optionsController');

router.get('/positions', requireAuth, listPositions);
router.post('/buy', requireAuth, buyOption);
router.post('/close/:id', requireAuth, closePosition);

module.exports = router;
