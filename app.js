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

// Middleware
const corsOptions = {
  origin: ['https://e-workspace-peach.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
  const allowedOrigins = ['https://e-workspace-peach.vercel.app', 'http://localhost:3000',  'http://localhost:3001'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, csrf-token');
  next();
});
app.get('/', (req, res) => {
  res.send('Welcome to the API root endpoint');
});

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
