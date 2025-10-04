import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.route.js";
import postRoute from "./routes/post.route.js";
import testRoute from "./routes/test.route.js";
import userRoute from "./routes/user.route.js";
import chatRoute from "./routes/chat.route.js";
import messageRoute from "./routes/message.route.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173", // Development
  "https://real-estate-poject-wwr3.vercel.app", // Production frontend
  process.env.CLIENT_URL // Environment variable fallback
].filter(Boolean);

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200 // Support legacy browsers
}));
app.use(express.json());
app.use(cookieParser());

// Root route for health check
app.get("/", (req, res) => {
  res.json({ message: "Real Estate API is running!", timestamp: new Date().toISOString() });
});

// Debug route to check authentication
app.get("/api/debug/auth", (req, res) => {
  res.json({
    message: "Debug endpoint",
    cookies: req.cookies,
    headers: {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/test", testRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);

// For Vercel deployment, export the app instead of listening
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8800;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}!`);
  });
}

export default app;
