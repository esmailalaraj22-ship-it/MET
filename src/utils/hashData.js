const crypto = require("crypto");
const ALGORITHM = "aes-256-cbc";

const getKey = () => {
  const secret = process.env.JWT_SECRET || "default_secret_key_32_chars_long!";
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32));
};

const encryptData = (text) => {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decryptData = (encryptedText) => {
  try {
    const key = getKey();
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
};

module.exports = { encryptData, decryptData };