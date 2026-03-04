// server.js - SoberFolks API Entry Point (Refactored & Modular)

const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import configurations
const { PORT, GEOHASH_PRECISION } = require("./config/constants");
const { pendingRideRequests } = require("./utils/rideState");

// Import middleware
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth.routes");
const locationRoutes = require("./routes/location.routes");
const ridesRoutes = require("./routes/rides.routes");
const driverRoutes = require("./routes/driver.routes");
const profileRoutes = require("./routes/profile.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const mapsRoutes = require("./routes/maps.routes");

const app = express();

// -------- Middleware --------
app.use(cors()); // Allow all origins for React Native
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// -------- API Routes --------
app.use("/", authRoutes);                     // /signup, /login
app.use("/api/location", locationRoutes);     // /api/location/update, /api/location/current
app.use("/api/rides", ridesRoutes);           // /api/rides/*
app.use("/api/driver", driverRoutes);         // /api/driver/pending-rides
app.use("/profile", profileRoutes);           // /profile/:role/:id, /driver/:id/availability
app.use("/api/feedback", feedbackRoutes);     // /api/feedback/*
app.use("/api", mapsRoutes);                  // /api/geocode, /api/directions, /api/places/*

// -------- Health Check --------
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    server: "SoberFolks API with Complete Booking System and Geohashing",
    features: [
      "Authentication",
      "Location Tracking with Geohashing",
      "Driver Queue Management",
      "Ride Booking with Timeout",
      "Real-time Driver Matching",
      "Geocoding & Directions",
      "Geohash-based Driver Search"
    ],
    activeRideRequests: pendingRideRequests.size
  });
});

// -------- Error Handling --------
app.use(errorHandler);
app.use(notFoundHandler);

// -------- Start Server --------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ SoberFolks API running at http://0.0.0.0:${PORT}`);
  console.log(`📍 Features enabled:`);
  console.log(`   ✓ Real-time location tracking with geohashing`);
  console.log(`   ✓ Geohash-based driver queue management (top 3 nearest)`);
  console.log(`   ✓ 30-second timeout per driver`);
  console.log(`   ✓ Automatic driver rotation`);
  console.log(`   ✓ Distance-based fare calculation`);
  console.log(`   ✓ Google Maps integration`);
  console.log(`   ✓ Ride booking and management`);
  console.log(`   ✓ Geohash precision: ${GEOHASH_PRECISION} (~1.2km accuracy)`);
  console.log(`\n🏗️  Architecture: Modular (routes → controllers → utils)`);
  console.log(`\n📂 Structure:`);
  console.log(`   ├── config/       (constants, database)`);
  console.log(`   ├── middleware/   (auth, error handling)`);
  console.log(`   ├── utils/        (helpers, distance, geohash, geocoding)`);
  console.log(`   ├── controllers/  (auth, location, rides, profile, feedback, maps)`);
  console.log(`   └── routes/       (auth, location, rides, driver, profile, feedback, maps)\n`);
});
