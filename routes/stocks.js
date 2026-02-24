// express
const express = require("express");
const router = express.Router();
const { authToken } = require("../middleware/authToken");

//  imports
const { getStockPrices, getStock, getStockLogo } = require("../controllers/stockController");

router.get("/all", authToken, getStockPrices);
router.get("/logo/:ticker", getStockLogo);
router.post("/:ticker", authToken, getStock);

module.exports = router;
