const ShortId = require("../models/ShortId");
const NewUser = require("../models/newUser");
const ReturnedUser = require("../models/ReturnedUser");
const UserActivityPdf = require("../models/UserActivityPdf");
const UserVisit = require('../models/UserBase');
const WebAnalytics = require("../models/webAnalytics");
const DocxAnalytics = require("../models/Docxanalytics");
const VideoAnalytics = require('../models/Videoanalytics');


// Helper function to fetch current location from backend (if needed)
const getCurrentLocation = async (ip) => {
  try {
    const response = await fetch(`https://ip-api.com/json/${ip}`);
    const data = await response.json();
    return data.city || "Unknown";
  } catch (error) {
    console.error("Error fetching location:", error);
    return "Unknown";
  }
};


// Get document by shortId
exports.getDocumentByShortId = async (req, res) => {
  const { id } = req.params; 


  // === Get Referrer Only ===
  const referrer = req.get("Referer") || req.headers.referer || "";
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      const host = refUrl.hostname;
      console.log("Referrer host:", host);

      // Optional: Identify platform
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
      console.error("Invalid referrer URL:", err.message);
    }
  } else {
    console.log("No referrer header found.");
  }

  // === Proceed with fetching the document ===
  try {
    const document = await ShortId.findOne({ shortId: id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.userIdentification = async (req, res) => {


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
    ip,
    location,
    userId,
    region,
    os,
    device,
    browser,
    pdfId,
    sessionId, // <-- New
    sourceUrl,
    totalPagesVisited,
    totalTimeSpent,
    pageTimeSpent,
    selectedTexts,
    totalClicks,
    mostVisitedPage,
    linkClicks = [],
    absenceHistory = [],
  } = req.body;

  if (!sessionId || !userId || !pdfId) {
    return res.status(400).json({ message: "Missing sessionId, userId, or pdfId" });
  }

  try {
    // 1. Fetch or create UserVisit
    let userVisit = await UserVisit.findOne({ userId }).sort({ createdAt: -1 });

    if (!userVisit || userVisit.location !== location) {
      userVisit = new UserVisit({ ip, location, userId, region, os, device, browser });
      await userVisit.save();
    }

    // 2. Check for existing record by sessionId
    const existingSession = await UserActivityPdf.findOne({ sessionId, userId, pdfId });

    let now = new Date();

    if (existingSession) {
      console.log("Session already exists. Updating record...");

      // Filter out duplicate link clicks
      let newLinkClicks = linkClicks.filter((click) =>
        !existingSession.linkClicks?.some(
          (existing) =>
            existing.page === click.page &&
            existing.clickedLink === click.clickedLink
        )
      );

      const updatedLinkClicks = [...(existingSession.linkClicks || []), ...newLinkClicks];

      await UserActivityPdf.updateOne(
        { _id: existingSession._id },
        {
          $set: {
            sourceUrl,
            totalPagesVisited,
            totalTimeSpent,
            pageTimeSpent,
            selectedTexts,
            totalClicks,
            outTime: now,
            mostVisitedPage,
            linkClicks: updatedLinkClicks,
            absenceHistory,
          },
        }
      );

      return res.status(200).json({
        message: "Session updated successfully",
        PdfAnalyticsdata: { ...req.body, outTime: now },
      });
    }

    // 3. No existing session, create new record
    console.log("Creating a new session record...");

    const analyticsDoc = new UserActivityPdf({
      userVisit: userVisit._id,
      sessionId, // <-- Save sessionId
      userId,
      pdfId,
      sourceUrl,
      totalPagesVisited,
      totalTimeSpent,
      pageTimeSpent,
      selectedTexts,
      totalClicks,
      inTime: now,
      outTime: now,
      mostVisitedPage,
      linkClicks,
      absenceHistory,
    });

    await analyticsDoc.save();

    return res.status(200).json({
      message: "New session created successfully",
      PdfAnalyticsdata: analyticsDoc,
    });
  } catch (error) {
    console.error("Error:", error.message);
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
      sessionId, // <-- NEW
      sourceUrl,
      absenceHistory = [],
    } = req.body;

    // Validate required fields
    if (!userId || !webId || !sourceUrl || !inTime || !outTime || !sessionId) {
      return res.status(400).json({ message: "Missing required fields including sessionId" });
    }

    const validatedPointerHeatmap = Array.isArray(pointerHeatmap) ? pointerHeatmap : [];

    // Fallback for location using IP (assume function exists)
    let currentLocation = location;
    if (!location) {
      currentLocation = await getUserLocation(ip); // you should define this if it's not already
    }

    // Fetch or create UserVisit
    let userVisit = await UserVisit.findOne({ userId }).sort({ createdAt: -1 });

    if (!userVisit || userVisit.location !== currentLocation) {
      userVisit = new UserVisit({
        ip,
        location: currentLocation,
        userId,
        region,
        os,
        device,
        browser,
      });
      await userVisit.save();
    }

    const now = new Date();

    // 🔍 Check for existing session first
    const existingSession = await WebAnalytics.findOne({ sessionId, userId, webId });

    if (existingSession) {
      console.log("Existing session found. Updating WebAnalytics record...");

      await WebAnalytics.updateOne(
        { _id: existingSession._id },
        {
          $set: {
            sourceUrl,
            outTime: new Date(outTime),
            totalTimeSpent,
            pointerHeatmap: validatedPointerHeatmap,
            absenceHistory,
          },
        }
      );

      return res.status(200).json({
        message: "Session updated successfully",
        WebAnalyticsData: { ...req.body, outTime },
      });
    }

    // No existing session: create new WebAnalytics record
    console.log("Creating a new WebAnalytics session record...");

    const webAnalyticsData = new WebAnalytics({
      userVisit: userVisit._id,
      userId,
      sessionId, // <-- NEW
      webId,
      sourceUrl,
      inTime: new Date(inTime),
      outTime: new Date(outTime),
      totalTimeSpent: totalTimeSpent || 0,
      pointerHeatmap: validatedPointerHeatmap,
      absenceHistory,
    });

    await webAnalyticsData.save();

    return res.status(200).json({
      message: "New Web analytics session created successfully",
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
    pdfId: docxId, // Rename to docxId for clarity
    sessionId, // <-- NEW
    sourceUrl,
    totalPagesVisited,
    totalTimeSpent,
    pageTimeSpent,
    selectedTexts,
    totalClicks,
    mostVisitedPage,
    linkClicks = [],
  } = req.body;

  if (!sessionId || !userId || !docxId) {
    return res.status(400).json({ message: "Missing sessionId, userId, or docxId" });
  }

  try {
    // 1. Fetch or create UserVisit
    let userVisit = await UserVisit.findOne({ userId }).sort({ createdAt: -1 });

    if (!userVisit || userVisit.location !== location) {
      userVisit = new UserVisit({ ip, location, userId, region, os, device, browser });
      await userVisit.save();
    }

    // 2. Check for existing session analytics
    const existingSession = await DocxAnalytics.findOne({ sessionId, userId, pdfId: docxId });

    const now = new Date();

    if (existingSession) {
      console.log("Existing Docx session found. Updating...");

      // Filter out duplicate link clicks
      const newLinkClicks = linkClicks.filter((click) =>
        !existingSession.linkClicks?.some(
          (existing) =>
            existing.page === click.page &&
            existing.clickedLink === click.clickedLink
        )
      );

      const updatedLinkClicks = [...(existingSession.linkClicks || []), ...newLinkClicks];

      await DocxAnalytics.updateOne(
        { _id: existingSession._id },
        {
          $set: {
            sourceUrl,
            totalPagesVisited,
            totalTimeSpent,
            pageTimeSpent,
            selectedTexts,
            totalClicks,
            outTime: now,
            mostVisitedPage,
            linkClicks: updatedLinkClicks,
          },
        }
      );

      return res.status(200).json({
        message: "DocxAnalytics session updated successfully",
        DocxAnalyticsdata: { ...req.body, outTime: now },
      });
    }

    // 3. No existing session, create new record
    console.log("Creating new DocxAnalytics session record...");

    const analyticsData = new DocxAnalytics({
      
      userVisit: userVisit._id,
      userId,
      sessionId, // <-- Save sessionId
      pdfId: docxId,
      sourceUrl,
      totalPagesVisited,
      totalTimeSpent,
      pageTimeSpent,
      selectedTexts,
      totalClicks,
      inTime: now,
      outTime: now,
      mostVisitedPage,
      linkClicks,
    });

    await analyticsData.save();

    console.log("New Docx analytics data inserted:", analyticsData);
    res.status(200).json({
      message: "New DocxAnalytics session created successfully",
      DocxAnalyticsdata: analyticsData,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.Videoanalytics = async (req, res) => {
  console.log(req.body);

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
    totalWatchTime,
    playCount,
    pauseCount,
    seekCount,
    pauseResumeEvents,
    skipEvents,
    jumpEvents,
    speedEvents,
    currentSpeedEvent,
    fullscreenEvents,
    download,
    currentPlayStart,
    totalWatchTimeFormatted,
    outTime, // Provided outTime from the client
    inTime,  // Optionally provided inTime from the client
    ...analyticsData
  } = req.body;

  // If totalWatchTime is 0, do not store the record.
  if (totalWatchTime === 0) {
    return res.status(200).json({
      message: "Watch time is zero. No analytics record stored.",
    });
  }

  try {
    // 1. Fetch the latest UserVisit for the user.
    let userVisit = await UserVisit.findOne({ userId }).sort({ createdAt: -1 });

    // 2. If no previous visit exists or if the location has changed, create a new UserVisit entry.
    if (!userVisit || userVisit.location !== location) {
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

    // 3. Get the current timestamp.
    const now = new Date();

    // Use provided inTime if available; otherwise, use the current time.
    const entryTimeToStore = inTime ? new Date(inTime) : now;

    // 4. Fetch the latest video analytics record for this user and videoId.
    const latestRecord = await VideoAnalytics.findOne({ userId, videoId }).sort({ outTime: -1 });

    if (latestRecord) {
      const timeDiff = now - new Date(latestRecord.outTime);
      console.log(timeDiff, "timediff");

      // 5. If the time difference is between 100ms and 60s and totalWatchTime is greater, update the last record.
      if (timeDiff >= 0 && timeDiff <= 60000) {
        console.log("Time difference is within the range.");
        console.log(totalWatchTime, latestRecord.totalWatchTime, "watch time");
        if (totalWatchTime >= latestRecord.totalWatchTime) {
          console.log("Updating existing VideoAnalytics record...");

          // Update the latest record with the new request data.
          // inTime remains as it was originally stored.
          await VideoAnalytics.updateOne(
            { _id: latestRecord._id },
            {
              $set: {
                sourceUrl,
                totalWatchTime,
                playCount,
                pauseCount,
                seekCount,
                pauseResumeEvents,
                skipEvents,
                jumpEvents,
                speedEvents,
                currentSpeedEvent,
                fullscreenEvents,
                download,
                currentPlayStart,
                totalWatchTimeFormatted,
                outTime: now, // Update outTime with the current timestamp
                ...analyticsData,
              },
            }
          );

          return res.status(200).json({
            message: "Video analytics record updated successfully",
            VideoAnalyticsdata: { ...req.body, outTime: now },
          });
        }
      }
    }

    // 6. If the time is out of range or totalWatchTime is less/equal, create a new analytics document.
    console.log("Creating a new VideoAnalytics record...");
    const videoAnalytics = new VideoAnalytics({
      userVisit: userVisit._id,
      userId,
      videoId,
      sourceUrl,
      totalWatchTime,
      playCount,
      pauseCount,
      seekCount,
      pauseResumeEvents,
      skipEvents,
      jumpEvents,
      speedEvents,
      currentSpeedEvent,
      fullscreenEvents,
      download,
      currentPlayStart,
      totalWatchTimeFormatted,
      inTime: entryTimeToStore, // Use provided inTime or current time if not provided
      outTime: now,
      sessionClosed: false,
      ...analyticsData,
    });

    await videoAnalytics.save();

    // 7. Return the created record.
    console.log(videoAnalytics, "New video analytics data inserted");
    res.status(200).json({
      message: "New VideoAnalytics record created successfully",
      VideoAnalyticsdata: videoAnalytics,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
