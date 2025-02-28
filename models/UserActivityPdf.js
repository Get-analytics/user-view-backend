const mongoose = require("mongoose");

// Define the schema for selected texts
const selectedTextSchema = new mongoose.Schema({
  selectedText: { type: String, required: true },
  count: { type: Number, required: true },
  page: { type: Number, required: true }
}, { _id: false }); // Disable _id for subdocuments

// Define the schema for link clicks
const linkClickSchema = new mongoose.Schema({
  page: { type: Number, required: true },
  clickedLink: { type: String, required: true }
}, { _id: false }); // Disable _id for subdocuments

// Define the analytics schema
const analyticsSchema = new mongoose.Schema(
  {
    userVisit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserVisit', // Reference the UserVisit model
      required: true
    },
    userId: { type: String, required: true }, // Add userId field to store the user ID
    pdfId: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    totalPagesVisited: { type: Number, required: true },
    totalTimeSpent: { type: Number, required: true },
    pageTimeSpent: { type: Map, of: Number, required: true },
    selectedTexts: { type: [selectedTextSchema], default: [] },
    totalClicks: { type: Number, default: 0 },
    inTime: { type: Date, required: true },
    outTime: { type: Date, required: true },
    mostVisitedPage: { type: String, required: true },
    linkClicks: { type: [linkClickSchema], default: [] }
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Create a model for the schema
const Analytics = mongoose.model('UserActivityPdf', analyticsSchema);

module.exports = Analytics;
