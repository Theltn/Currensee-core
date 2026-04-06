const { connectToDB } = require("../db/mongoClient");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const secretKey = process.env.JWT_SECRET || process.env.VITE_JSON_WEB_KEY;

const createComment = async (req, res) => {
  const { ticker, username, comment } = req.body;
  try {
    // Check if user is logged in
    const db = await connectToDB();
    const comments = db.collection("comments");
    // Create new comment document
    const newComment = {
      username,
      ticker,
      comment,
      createdAt: new Date(),
    };
    const result = await comments.insertOne(newComment);
    res
      .status(201)
      .json({ message: "Comment posted", commentId: result.insertedId });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ error: "Failed to post comment." });
  }
};
const editComment = async (req, res) => {
  const { commentId } = req.params;
  const { updatedComment } = req.body;

  // Ensure you have the username from your auth middleware (e.g., decoded JWT)
  const username = req.user?.username;

  if (!updatedComment || !username) {
    return res.status(400).json({ error: "Invalid data." });
  }

  try {
    const db = await connectToDB();
    const comments = db.collection("comments");

    const result = await comments.updateOne(
      { _id: new ObjectId(commentId), username: username },
      { $set: { comment: updatedComment } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: "Comment not found or not owned by user." });
    }

    return res.status(200).json({ message: "Comment updated successfully." });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({ error: "Failed to update comment." });
  }
};

const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const username = req.user?.username; // assuming your authToken middleware sets this
  console.log("Trying to delete comment:", commentId, "by user:", username);

  try {
    const db = await connectToDB();
    const comments = db.collection("comments");

    // First, find the comment
    const comment = await comments.findOne({ _id: new ObjectId(commentId) });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found." });
    }

    // Check if the comment belongs to the user
    if (comment.username !== username) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this comment." });
    }

    // Now delete it
    const result = await comments.deleteOne({ _id: new ObjectId(commentId) });

    res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment." });
  }
};
const getStockComments = async (req, res) => {
  const ticker = req.params.ticker;
  try {
    const db = await connectToDB();
    const comments = db.collection("comments");

    const stockComments = await comments.find({ ticker: ticker }).toArray();

    res.status(200).json({ comments: stockComments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments." });
  }
};

module.exports = {
  createComment,
  deleteComment,
  getStockComments,
  editComment,
};
