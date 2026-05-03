const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authToken');
const {
  getWatchlist,
  addToWatchlist,
  updateWatchlistItem,
  removeFromWatchlist,
} = require('../controllers/watchlistController');

router.get('/', requireAuth, getWatchlist);
router.post('/', requireAuth, addToWatchlist);
router.put('/:ticker', requireAuth, updateWatchlistItem);
router.delete('/:ticker', requireAuth, removeFromWatchlist);

module.exports = router;
