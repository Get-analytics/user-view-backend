const mongoose = require("mongoose");

const CountSchema = new mongoose.Schema({
  weblink: { type: Number, default: 0 },
  pdf: { type: Number, default: 0 },
  video: { type: Number, default: 0 },
  docx: { type: Number, default: 0 },
});

const ReturnedUserSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  userId: { type: String, required: true }, // No unique index
  createdAt: { type: Date, default: Date.now },
  count: { type: CountSchema, default: {} },
  lastRequestTime: { type: Date },
  __v: { type: Number, select: false }
});

// Ensure there is NO unique constraint
ReturnedUserSchema.index({ userId: 1, documentId: 1 }, { unique: false });

module.exports = mongoose.model("ReturnedUser", ReturnedUserSchema);
