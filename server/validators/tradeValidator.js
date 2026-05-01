/**
 * Trade request validation middleware.
 * Validates the request body for POST /portfolio/trade before it reaches the controller.
 * Returns 400 with specific error messages for invalid input.
 */
const validateTrade = (req, res, next) => {
  const { ticker, type, shares, pricePerShare } = req.body;
  const errors = [];

  // Ticker
  if (!ticker || typeof ticker !== 'string' || !ticker.trim()) {
    errors.push('ticker is required.');
  } else if (!/^[A-Za-z]{1,5}$/.test(ticker.trim())) {
    errors.push('ticker must be 1-5 letters.');
  }

  // Type
  if (!type || typeof type !== 'string') {
    errors.push('type is required (BUY or SELL).');
  } else if (!['BUY', 'SELL'].includes(type.trim().toUpperCase())) {
    errors.push('type must be BUY or SELL.');
  }

  // Shares
  if (shares === undefined || shares === null) {
    errors.push('shares is required.');
  } else {
    const qty = parseInt(shares, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push('shares must be a positive integer.');
    }
  }

  // Price per share
  if (pricePerShare === undefined || pricePerShare === null) {
    errors.push('pricePerShare is required.');
  } else {
    const price = parseFloat(pricePerShare);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push('pricePerShare must be a positive number.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  next();
};

module.exports = validateTrade;
