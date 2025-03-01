const ShortId = require("../models/ShortId");
const NewUser = require("../models/newUser");
const ReturnedUser = require("../models/ReturnedUser");
const UserActivityPdf = require("../models/UserActivityPdf");
const UserVisit = require('../models/UserBase');
const WebAnalytics = require("../models/webAnalytics");
const DocxAnalytics = require("../models/Docxanalytics");
const VideoAnalytics = require('../models/Videoanalytics');


// Get document by shortId
exports.getDocumentByShortId = async (req, res) => {
  const { id } = req.params;
  
  // Log the user's IP address and the requested shortId.
  console.log(req.ip, "ip address");
  console.log("ShortId:", id);
  
  // Retrieve the referrer from the request headers.
  const referrer = req.get("Referer") || req.headers.referer || "";
  
  if (referrer) {
    try {
      // Use the URL API to parse the referrer URL.
      const refUrl = new URL(referrer);
      const host = refUrl.hostname;
      console.log("User came from:", host);
      
      // Optionally, you can add logic to further identify known platforms:
      if (host.includes("instagram.com")) {
        console.log("User came from Instagram");
      } else if (host.includes("youtube.com")) {
        console.log("User came from YouTube");
      } else if (host.includes("medium.com")) {
        console.log("User came from Medium");
      } else {
        console.log("User came from another platform:", host);
      }
    } catch (err) {
      console.error("Error parsing referrer:", err);
    }
  } else {
    console.log("No referrer header found.");
  }

  try {
    const document = await ShortId.findOne({ shortId: id });
    console.log("Document:", document);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





exports.getAnalyticsPdf = async (req, res) => {
  console.log(req.body);

  const { 
    ip, location, userId, region, os, device, browser, 
    pdfId, sourceUrl, totalPagesVisited, totalTimeSpent, 
    pageTimeSpent, selectedTexts, totalClicks, mostVisitedPage, 
    linkClicks 
  } = req.body;

  try {
    // Check if UserVisit exists or create a new one
    let userVisit = await UserVisit.findOne({ userId });

    if (!userVisit) {
      // If no UserVisit found, create a new one
      userVisit = new UserVisit({
        ip,
        location,
        userId,
        region,
        os,
        device,
        browser,
      });
      await userVisit.save();
    }

    // ✅ Always create a new entry in the DB (instead of updating)
    const analyticsData = new UserActivityPdf({
      userVisit: userVisit._id, // Save the ObjectId of the UserVisit
      userId, // Save the userId
      pdfId,
      sourceUrl,
      totalPagesVisited,
      totalTimeSpent,
      pageTimeSpent,
      selectedTexts,
      totalClicks,
      inTime: new Date(),
      outTime: new Date(),
      mostVisitedPage,
      linkClicks,
    });

    await analyticsData.save(); // ✅ Always inserts a new document

    console.log(analyticsData, "data ")

    res.status(200).json({ PdfAnalyticsdata: analyticsData });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




exports.NewUserCount = async (req, res) => {
  try {
    const { userId, mimeType } = req.body;

    console.log(userId , mimeType)

    // Check if user already exists
    const existingUser = await NewUser.findOne({ userId });

    if (!existingUser) {
      // New user, store in NewUser collection with a count for the mimetype
      const newUser = await NewUser.create({
        userId,
        count: { [mimeType]: 1 }, // Set the count for the specific mimetype
      });
      return res.json({ message: "New user added", userId, count: newUser.count });
    } else {
      // User exists, increment count for the mimetype
      if (existingUser.count[mimeType]) {
        existingUser.count[mimeType] += 1; // Increment the count for the existing mimetype
      } else {
        existingUser.count[mimeType] = 1; // Initialize the count for the mimetype if not present
      }
      await existingUser.save();

      return res.json({ message: "User already exists, count updated", userId, count: existingUser.count });
    }
  } catch (error) {
    console.error("Error in NewUserCount:", error);
    res.status(500).json({ error: "Server error" });
  }
};


exports.ReturnedUserCount = async (req, res) => {
  try {
    const { userId, mimeType } = req.body;

    // Check if user exists in ReturnedUser collection
    const existingUser = await ReturnedUser.findOne({ userId });

    if (existingUser) {
      // Increment the count for the specific mimetype for the returning user
      if (existingUser.count[mimeType]) {
        existingUser.count[mimeType] += 1; // Increment count for the mimetype
      } else {
        existingUser.count[mimeType] = 1; // Initialize the count for the mimetype
      }
      await existingUser.save();

      return res.json({ message: "Returning user recorded, count updated", userId, count: existingUser.count });
    } else {
      // If the user doesn't exist, create a new record with count 1 for the mimetype
      const newReturnedUser = await ReturnedUser.create({
        userId,
        count: { [mimeType]: 1 }, // Initialize the mimetype count to 1
      });
      return res.json({ message: "Returning user recorded", userId, count: newReturnedUser.count });
    }
  } catch (error) {
    console.error("Error in ReturnedUserCount:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.webViewAnalytics = async (req, res) => {
  console.log(req.body, "web analytics");

  try {
    // Destructure request body
    const {
      ip,
      location,
      userId,
      region,
      os,
      device,
      browser,
      inTime,
      outTime,
      totalTimeSpent,
      pointerHeatmap,
      webId,
      sourceUrl,
    } = req.body;

    // Validate required fields
    if (!userId || !webId || !sourceUrl || !inTime || !outTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Ensure pointerHeatmap is an array
    const validatedPointerHeatmap = Array.isArray(pointerHeatmap) ? pointerHeatmap : [];

    // Check if UserVisit already exists for this user
    let userVisit = await UserVisit.findOne({ userId });

    if (!userVisit) {
      // Create a new UserVisit record if it doesn't exist
      userVisit = new UserVisit({
        ip: ip || "Unknown",
        location: location || "Unknown",
        userId,
        region: region || "Unknown",
        os: os || "Unknown",
        device: device || "Unknown",
        browser: browser || "Unknown",
      });
      await userVisit.save();
    }

    // Create a new WebAnalytics entry (each request creates a new document)
    const webAnalyticsData = new WebAnalytics({
      userVisit: userVisit._id, // Link to UserVisit
      webId,
      sourceUrl,
      inTime: new Date(inTime),
      outTime: new Date(outTime),
      totalTimeSpent: totalTimeSpent || 0,
      pointerHeatmap: validatedPointerHeatmap,
    });

    // Save the new WebAnalytics entry
    await webAnalyticsData.save();

    res.status(200).json({ message: "Web analytics data saved successfully", WebAnalyticsData: webAnalyticsData });
  } catch (error) {
    console.error("Error saving web analytics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



exports.Docxanalytics = async (req, res) => {
  console.log(req.body);

  const {
    ip, location, userId, region, os, device, browser, pdfId, sourceUrl,
    totalPagesVisited, totalTimeSpent, pageTimeSpent, selectedTexts,
    totalClicks, mostVisitedPage, linkClicks
  } = req.body;

  try {
    // Ensure a UserVisit entry exists for the user
    let userVisit = await UserVisit.findOne({ userId });

    if (!userVisit) {
      userVisit = new UserVisit({
        ip, location, userId, region, os, device, browser
      });
      await userVisit.save();
    }

    // Create a new analytics entry every time (no updating old records)
    const analyticsData = new DocxAnalytics({
      userVisit: userVisit._id, // Save the ObjectId of the UserVisit
      pdfId,
      sourceUrl,
      totalPagesVisited,
      totalTimeSpent,
      pageTimeSpent,
      selectedTexts,
      totalClicks,
      inTime: new Date(),
      outTime: new Date(),
      mostVisitedPage,
      linkClicks
    });

    await analyticsData.save();

    res.status(200).json({ PdfAnalyticsdata: analyticsData });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





exports.Videoanalytics = async (req, res) => {
  try {
    // Destructure user and video analytics fields from req.body
    const {
      ip,
      location,
      userId,
      region,
      os,
      device,
      browser,
      videoId,
      sourceUrl,
      ...analyticsData
    } = req.body;

    // Save user data (if not already saved or as required)
    const userVisit = new UserVisit({
      ip: ip || "",
      location: location || "",
      userId: userId || "",
      region: region || "",
      os: os || "",
      device: device || "",
      browser: browser || "",
    });
    await userVisit.save();

    // Save video analytics data including videoId and sourceUrl.
    // Link the analytics to the saved userVisit by including its _id.
    const videoAnalytics = new VideoAnalytics({
      ...analyticsData,
      videoId: videoId || "",
      sourceUrl: sourceUrl || "",
      userVisit: userVisit._id, // Interlink by referencing the userVisit document ID
    });
    await videoAnalytics.save();

    res.json({ userVisit, videoAnalytics });
  } catch (error) {
    console.error("Error saving analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


