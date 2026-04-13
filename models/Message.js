const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  email: String,
  phone: String,
  message: String,
  sentAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);