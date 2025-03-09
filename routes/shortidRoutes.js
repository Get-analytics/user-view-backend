const express = require("express");
const router = express.Router();
const { getDocumentByShortId, getAnalyticsPdf,  ReturnedUserCount , webViewAnalytics, Docxanalytics , Videoanalytics , userIdentification} = require("../controllers/shortidController");


router.get("/viewer/:id", getDocumentByShortId);
router.post("/pdfpageinfo", getAnalyticsPdf);
router.post("/user/identify", userIdentification);
router.post("/existUser", ReturnedUserCount);
router.post("/webpageinteraction/analytics", webViewAnalytics);
router.post("/Docx/DocxAnalytics", Docxanalytics);
router.post("/video/analytics", Videoanalytics);






module.exports = router;
