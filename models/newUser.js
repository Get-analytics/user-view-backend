const mongoose = require("mongoose");

const CountSchema = new mongoose.Schema({
  weblink: { type: Number, default: 0 },
  pdf: { type: Number, default: 0 },
  video: { type: Number, default: 0 },
  docx: { type: Number, default: 0 },
});

const NewUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  count: { type: CountSchema, default: {} },
  __v: { type: Number, select: false }, // Exclude versioning field
});

module.exports = mongoose.model("NewUser", NewUserSchema);
