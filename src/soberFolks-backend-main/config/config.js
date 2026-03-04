// config.js - All application configuration and constants

require("dotenv").config();

// Server Configuration
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "3cd55083223f2738ec3b05d633a6c3e5559d153c6aabf1eab3438e2ece9188adc5bb5701b468f51c08e95c8b1a2522154b5863d0f3e7e5f8d444e84fb3e873bf";

// Google Maps API Configuration
const GOOGLE_MAPS_API_KEY = "AIzaSyDXZWx0j9N1BdFzQ0lP3bVF8SQJlP0xUhQ";

// Booking System Configuration
const RIDE_REQUEST_TIMEOUT = 120000; // 2 minutes per driver
const pendingRideRequests = new Map(); // Store active ride requests

// Geohash Configuration
const GEOHASH_PRECISION = 6; // ~1.2km accuracy
const GEOHASH_NEIGHBORS_PRECISION = 5; // ~4.9km accuracy for expanding search

module.exports = {
  PORT,
  JWT_SECRET,
  GOOGLE_MAPS_API_KEY,
  RIDE_REQUEST_TIMEOUT,
  pendingRideRequests,
  GEOHASH_PRECISION,
  GEOHASH_NEIGHBORS_PRECISION,
};
