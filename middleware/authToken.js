const jwt = require("jsonwebtoken");
const webkey = process.env.JWT_SECRET || process.env.VITE_JSON_WEB_KEY;

const authToken = (req, res, next) => {
  console.log("Cookies received:", req.cookies);
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }
  try {
    const user = jwt.verify(token, webkey);
    req.user = user;
    next();
  } catch {
    res.clearCookie("token");
    console.log("Cookie monster ate ur cookies");
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
};

module.exports = { authToken };
