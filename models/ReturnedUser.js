const mongoose = require("mongoose");

const CountSchema = new mongoose.Schema({
  weblink: { type: Number, default: 0 },
  pdf: { type: Number, default: 0 },
  video: { type: Number, default: 0 },
  docx: { type: Number, default: 0 },
});

const ReturnedUserSchema = new mongoose.Schema({
  documentId: { type: String, required: true }, // Document IDs as an array
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  count: { type: CountSchema, default: {} },
  lastRequestTime: { type: Date },  // New field to store the last update time,
  __v: { type: Number, select: false }, // Exclude versioning field
});

module.exports = mongoose.model("ReturnedUser", ReturnedUserSchema);
