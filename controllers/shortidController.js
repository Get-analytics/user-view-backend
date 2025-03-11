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

exports.userIdentification = async (req, res) => {
  console.log("Received request body for user action update:", req.body);

  const { userId, documentId, mimeType } = req.body;

  if (userId === "Generating...") {
    console.log("UserId is 'Generating...', skipping database operations.");
    return res.status(200).json({ message: "User ID is 'Generating...', no action taken." });
  }

  try {
    const currentTime = new Date();

    // Step 1: Check if a record exists for this user with the same documentId.
    let newUserRecord = await NewUser.findOne({ userId, documentId });

    if (!newUserRecord) {
      console.log(`No record found for userId: ${userId} with documentId: ${documentId}. Creating new record.`);

      // Create a new record with count always set to 1
      newUserRecord = new NewUser({
        userId,
        documentId,
        count: { [mimeType]: 1 }, // Always 1 for new users
        lastRequestTime: currentTime
      });

      await newUserRecord.save();
      console.log("New User Record Created:", newUserRecord);
    } else {
      const timeDiff = currentTime - new Date(newUserRecord.lastRequestTime);

      if (timeDiff < 60000) {
        console.log("Request received within 1 minute; skipping update.");
        return res.status(200).json({ message: "Request received within 1 minute, no update." });
      }

      // Update lastRequestTime only, without changing the count
      newUserRecord.lastRequestTime = currentTime;
      console.log(`Last request time updated for userId: ${userId}, documentId: ${documentId}.`);

      await newUserRecord.save();
    }

    // Step 2: Update ReturnedUser collection, incrementing count
    const returnedUserUpdateResult = await ReturnedUser.updateOne(
      { userId, documentId },
      {
        $inc: { [`count.${mimeType}`]: 1 }
      },
      { upsert: true }
    );

    if (returnedUserUpdateResult.upsertedCount > 0) {
      console.log("New ReturnedUser record created with documentId and mimeType.");
    } else if (returnedUserUpdateResult.modifiedCount > 0) {
      console.log("ReturnedUser record updated with new mimeType count.");
    } else {
      console.log("No changes to ReturnedUser record.");
    }

    res.status(200).json({ message: "User action updated successfully.", lastUpdate: currentTime.toISOString() });

  } catch (error) {
    console.error("Error during user action processing:", error);
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
    // 1. Ensure a UserVisit exists.
    let userVisit = await UserVisit.findOne({ userId });
    if (!userVisit) {
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

    // 2. Define today's boundaries.
    // These dates are based on the server's local time.
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 3. Delete any analytics document for this userId and pdfId that was created today.
    // (We assume that the "inTime" field is stored as a Date.)
    await UserActivityPdf.deleteMany({ 
      userId, 
      pdfId,
      inTime: { $gte: startOfToday, $lt: endOfToday }
    });

    // 4. Create a new analytics document with the incoming payload.
    const analyticsDoc = new UserActivityPdf({
      userVisit: userVisit._id,
      userId,
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
      sessionClosed: false,
    });

    await analyticsDoc.save();

    console.log(analyticsDoc, "new analytics data inserted");
    res.status(200).json({ PdfAnalyticsdata: analyticsDoc });
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
    const validatedPointerHeatmap = Array.isArray(pointerHeatmap)
      ? pointerHeatmap
      : [];

    // 1. Check if UserVisit already exists for this user
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

    // 2. Define today's boundaries (using server local time or UTC as needed)
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 3. Delete any existing WebAnalytics record for this userVisit and webId created today.
    await WebAnalytics.deleteMany({
      webId,
      userVisit: userVisit._id,
      inTime: { $gte: startOfToday, $lt: endOfToday },
    });

    // 4. Create a new WebAnalytics entry with the incoming payload.
    const webAnalyticsData = new WebAnalytics({
      userVisit: userVisit._id, // Link to UserVisit
      webId,
      sourceUrl,
      inTime: new Date(inTime),
      outTime: new Date(outTime),
      totalTimeSpent: totalTimeSpent || 0,
      pointerHeatmap: validatedPointerHeatmap,
    });

    // 5. Save the new WebAnalytics entry.
    await webAnalyticsData.save();

    res.status(200).json({
      message: "Web analytics data saved successfully",
      WebAnalyticsData: webAnalyticsData,
    });
  } catch (error) {
    console.error("Error saving web analytics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





exports.Docxanalytics = async (req, res) => {
  console.log(req.body);

  const {
    ip,
    location,
    userId,
    region,
    os,
    device,
    browser,
    pdfId, // Use pdfId (or document id) as the unique identifier for the doc
    sourceUrl,
    totalPagesVisited,
    totalTimeSpent,
    pageTimeSpent,
    selectedTexts,
    totalClicks,
    mostVisitedPage,
    linkClicks
  } = req.body;

  try {
    // 1. Ensure a UserVisit entry exists for the user.
    let userVisit = await UserVisit.findOne({ userId });
    if (!userVisit) {
      userVisit = new UserVisit({
        ip,
        location,
        userId,
        region,
        os,
        device,
        browser
      });
      await userVisit.save();
    }

    // 2. Define today's date boundaries.
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 3. Delete any existing DocxAnalytics record for this user and pdfId created today.
    await DocxAnalytics.deleteMany({
      userId,
      pdfId,
      inTime: { $gte: startOfToday, $lt: endOfToday }
    });

    // 4. Create a new analytics entry with the incoming payload.
    const analyticsData = new DocxAnalytics({
      userVisit: userVisit._id,
      userId,
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

    console.log(analyticsData, "new Docx analytics data inserted");
    res.status(200).json({ DocxAnalyticsdata: analyticsData });
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
      // inTime and outTime can be ignored if not used in your schema,
      // since you're relying on createdAt for deletion.
      ...analyticsData
    } = req.body;

    // 1. Ensure a UserVisit exists for this user.
    let userVisit = await UserVisit.findOne({ userId });
    if (!userVisit) {
      userVisit = new UserVisit({
        ip: ip || "",
        location: location || "",
        userId: userId || "",
        region: region || "",
        os: os || "",
        device: device || "",
        browser: browser || "",
      });
      await userVisit.save();
    }

    // 2. Compute today's boundaries in UTC (matching your DB's createdAt timestamps).
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    // 3. Delete any existing VideoAnalytics document for this user and videoId created today (using createdAt).
    await VideoAnalytics.deleteMany({
      videoId,
      userVisit: userVisit._id,
      createdAt: { $gte: startOfToday, $lt: endOfToday },
    });

    // 4. Create a new VideoAnalytics entry with the incoming payload.
    const videoAnalytics = new VideoAnalytics({
      ...analyticsData,
      videoId: videoId || "",
      sourceUrl: sourceUrl || "",
      userVisit: userVisit._id,
      // createdAt will be automatically set by Mongoose if using timestamps.
    });
    await videoAnalytics.save();

    res.status(200).json({ userVisit, videoAnalytics });
  } catch (error) {
    console.error("Error saving analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
