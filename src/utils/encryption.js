const crypto = require("crypto");
const rawKey = process.env.MESSAGE_SECRET_KEY;
const key = crypto.createHash("sha256").update(rawKey).digest(); // 32 байти
const IV_LENGTH = 16;

// Шифрування
const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

// Розшифрування (кидає помилку при неправильному форматі)
const decrypt = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(":");

  if (!ivHex || !encrypted) {
    throw new Error("Невірний формат шифрованого повідомлення.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

// Безпечне розшифрування (повертає оригінальний текст при помилці)
const safeDecrypt = (encryptedText) => {
  try {
    return decrypt(encryptedText);
  } catch {
    return encryptedText;
  }
};

module.exports = {
  encrypt,
  decrypt,
  safeDecrypt,
};
