const mongoose = require("mongoose");
const { Schema } = mongoose;

// Sub-schema for pause/resume events
const PauseResumeEventSchema = new Schema(
  {
    pauseTime: { type: Number, required: true },
    pauseTimeFormatted: { type: String, required: true },
    resumeTime: { type: Number, default: null },
    resumeTimeFormatted: { type: String, default: null },
  },
  { _id: false }
);

// Sub-schema for skip events (timeline drags)
const SkipEventSchema = new Schema(
  {
    from: { type: Number, required: true },
    fromFormatted: { type: String, required: true },
    to: { type: Number, required: true },
    toFormatted: { type: String, required: true },
  },
  { _id: false }
);

// Sub-schema for jump events (10‑sec jumps)
const JumpEventSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["replay", "forward"],
    },
    from: { type: Number, required: true },
    fromFormatted: { type: String, required: true },
    to: { type: Number, required: true },
    toFormatted: { type: String, required: true },
  },
  { _id: false }
);

// Sub-schema for completed speed events
const SpeedEventSchema = new Schema(
  {
    speed: { type: Number, required: true },
    startTime: { type: Number, required: true },
    startTimeFormatted: { type: String, required: true },
    endTime: { type: Number, required: true },
    endTimeFormatted: { type: String, required: true },
  },
  { _id: false }
);

// Sub-schema for an ongoing speed event (can be null)
const CurrentSpeedEventSchema = new Schema(
  {
    speed: { type: Number, required: true },
    startTime: { type: Number, required: true },
    // endTime remains optional since the event might not be finalized yet
    endTime: { type: Number, default: null },
  },
  { _id: false }
);

// Sub-schema for fullscreen events
const FullscreenEventSchema = new Schema(
  {
    entered: { type: Number, required: true },
    enteredFormatted: { type: String, required: true },
    exited: { type: Number, required: true },
    exitedFormatted: { type: String, required: true },
  },
  { _id: false }
);

// Main analytics schema (video analytics)
const VideoAnalyticsSchema = new Schema(
  {
    // Link to the UserVisit document
    userVisit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserVisit",
      required: true,
    },
    // New field added so that you can query by userId
    userId: { type: String, required: true },
    totalWatchTime: { type: Number, required: true },
    playCount: { type: Number, required: true },
    pauseCount: { type: Number, required: true },
    seekCount: { type: Number, required: true },
    pauseResumeEvents: { type: [PauseResumeEventSchema], default: [] },
    skipEvents: { type: [SkipEventSchema], default: [] },
    jumpEvents: { type: [JumpEventSchema], default: [] },
    speedEvents: { type: [SpeedEventSchema], default: [] },
    currentSpeedEvent: {
      type: CurrentSpeedEventSchema,
      default: null,
    },
    fullscreenEvents: { type: [FullscreenEventSchema], default: [] },
    download: { type: Boolean, required: true },
    currentPlayStart: { type: Number, default: null },
    totalWatchTimeFormatted: { type: String, required: true },
    inTime: { type: Date, required: true },
    outTime: { type: Date, required: true },
    videoId: { type: String, required: true },
    sourceUrl: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoAnalytics", VideoAnalyticsSchema);
