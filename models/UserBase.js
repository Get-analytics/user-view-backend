const mongoose = require("mongoose");

// Define the schema for storing user data
const userVisitSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
    },
  location: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      required: true,
    },
    os: {
      type: String,
      required: true,
    },
    device: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

// Create a model for the schema
const UserVisit = mongoose.model("UserVisit", userVisitSchema);

module.exports = UserVisit;
