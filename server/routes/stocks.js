// express
const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authToken");

// imports
const { getStockPrices, getStock, getStockLogo } = require("../controllers/stockController");

router.get("/all", requireAuth, getStockPrices);
router.get("/logo/:ticker", getStockLogo);
router.post("/:ticker", getStock);

module.exports = router;
