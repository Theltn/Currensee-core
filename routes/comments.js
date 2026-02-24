// express
const express = require("express");
const router = express.Router();
const {
  createComment,
  deleteComment,
  getStockComments,
  editComment,
} = require("../controllers/commentController");
const { authToken } = require("../middleware/authToken");

//  imports
router.post("/create", authToken, createComment);
router.delete("/comment/:commentId", authToken, deleteComment);
router.patch("/comment/:commentId", authToken, editComment);

router.get("/:ticker", authToken, getStockComments);

module.exports = router;
