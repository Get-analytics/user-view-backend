const mongoose = require("mongoose");

// Define schema for pointer heatmap (position and time spent)
const pointerHeatmapSchema = new mongoose.Schema(
  {
    position: { type: String, required: true },
    timeSpent: { type: Number, required: true },
  },
  { _id: false } // Disable _id for subdocuments
);

// Define schema for web analytics data
const webAnalyticsSchema = new mongoose.Schema(
  {
    userVisit: { type: mongoose.Schema.Types.ObjectId, ref: "UserVisit", required: true }, // Reference to UserVisit
    userId: { type : String, required : true},
    webId: { type : String, required : true},
    sourceUrl: { type : String, required : true},
    inTime: { type: Date, required: true },
    outTime: { type: Date, required: true },
    totalTimeSpent: { type: Number, required: true },
    pointerHeatmap: [pointerHeatmapSchema], // Store heatmap data
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

const WebAnalytics = mongoose.model("WebAnalytics", webAnalyticsSchema);

module.exports = WebAnalytics;
