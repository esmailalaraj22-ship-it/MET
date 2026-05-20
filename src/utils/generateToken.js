const jwt = require("jsonwebtoken");

const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d",
  });

const verifyToken = (token, secret) => jwt.verify(token, secret);

module.exports = { generateAccessToken, generateRefreshToken, verifyToken };