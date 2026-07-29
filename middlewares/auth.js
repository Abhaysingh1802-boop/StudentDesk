const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;

async function auth(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Login required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

function adminOnly(req, res, next) {
  console.log(req.user);
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only."
    });
  }

  next();
}


module.exports = { auth, adminOnly };
