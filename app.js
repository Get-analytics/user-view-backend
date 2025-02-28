const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const shortidRoutes = require("./routes/shortidRoutes");



// Initialize app
const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use("/api/shortid", shortidRoutes);
app.use("/api/UserBaseInfo", shortidRoutes);
app.use("/api/PdfInfo", shortidRoutes);
app.use("/api/test1", shortidRoutes);
app.use("/api/test2", shortidRoutes);
app.use("/api/v1", shortidRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
