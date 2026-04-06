// express
const express = require("express");
const router = express.Router();
const {
  loginUser,
  signupUser,
  getBalance,
  getPositions,
  updateBalance,
  buyAsset,
  clearCookies,
  sellAsset,
} = require("../controllers/userController");
const { authToken } = require("../middleware/authToken");

//  imports
router.post("/login", loginUser);
router.post("/signup", signupUser);
router.post("/getBalance", getBalance);
router.post("/getPositions", getPositions);
router.post("/updateBalance", updateBalance);
router.post("/buyAsset", buyAsset);
router.post("/sellAsset", sellAsset);
router.post("/logout", authToken, clearCookies);

module.exports = router;
