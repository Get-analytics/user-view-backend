const express = require("express");
const router = express.Router();
const { getDocumentByShortId, getAnalyticsPdf, NewUserCount, ReturnedUserCount , webViewAnalytics, Docxanalytics , Videoanalytics} = require("../controllers/shortidController");


router.get("/viewer/:id", getDocumentByShortId);
router.post("/pdfpageinfo", getAnalyticsPdf);
router.post("/newUser", NewUserCount);
router.post("/existUser", ReturnedUserCount);
router.post("/webpageinteraction/analytics", webViewAnalytics);
router.post("/Docx/DocxAnalytics", Docxanalytics);
router.post("/video/analytics", Videoanalytics);






module.exports = router;
