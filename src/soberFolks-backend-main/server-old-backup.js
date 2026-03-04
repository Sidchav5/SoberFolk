// server.js - Enhanced with Location Services, Complete Booking System, and Geohashing

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db"); // Your db.js connection file
const ngeohash = require('ngeohash'); // Geohashing library
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "3cd55083223f2738ec3b05d633a6c3e5559d153c6aabf1eab3438e2ece9188adc5bb5701b468f51c08e95c8b1a2522154b5863d0f3e7e5f8d444e84fb3e873bf";

// Booking System Configuration
const RIDE_REQUEST_TIMEOUT = 120000; // 30 seconds
const pendingRideRequests = new Map(); // Store active ride requests

// Geohash Configuration
const GEOHASH_PRECISION = 6; // ~1.2km accuracy
const GEOHASH_NEIGHBORS_PRECISION = 5; // ~4.9km accuracy for expanding search

// -------- Middleware --------
app.use(cors()); // Allow all origins for React Native

app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// -------- JWT Middleware --------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ error: "Access denied. Token missing" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// -------- Utility Functions --------
const convertDateFormat = (ddmmyyyy) => {
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Calculate fare based on distance
const calculateFare = (distanceKm) => {
  const baseFare = 50; // Base fare in rupees
  const perKmRate = 15; // Rate per km
  return Math.round(baseFare + (distanceKm * perKmRate));
};

// -------- Geohash Utility Functions --------
// Generate geohash for coordinates
const generateGeohash = (latitude, longitude) => {
  return ngeohash.encode(latitude, longitude, GEOHASH_PRECISION);
};

// Get neighboring geohashes for expanded search
const getNeighboringGeohashes = (latitude, longitude) => {
  const baseGeohash = ngeohash.encode(latitude, longitude, GEOHASH_NEIGHBORS_PRECISION);
  return ngeohash.neighbors(baseGeohash);
};

// Update location with geohash
const updateLocationWithGeohash = async (userId, latitude, longitude, address, role) => {
  const geohash = generateGeohash(latitude, longitude);
  const table = role === "Consumer" ? "consumer_locations" : "driver_locations";
  
  const updateQuery = `
    UPDATE ${table} 
    SET latitude = $1, longitude = $2, address = $3, geohash = $4, updated_at = NOW() 
    WHERE user_id = $5
  `;

  try {
    const result = await db.query(updateQuery, [latitude, longitude, address, geohash, userId]);
    
    if (result.rowCount === 0) {
      // Insert new location if doesn't exist
      const insertQuery = `
        INSERT INTO ${table} (user_id, latitude, longitude, address, geohash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `;
      await db.query(insertQuery, [userId, latitude, longitude, address, geohash]);
    }
  } catch (err) {
    console.error('Error updating location with geohash:', err);
    throw err;
  }
};

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = "AIzaSyDXZWx0j9N1BdFzQ0lP3bVF8SQJlP0xUhQ";
const axios = require('axios');

// Real geocoding function using Google Maps API
const geocodeAddress = async (address) => {
  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log(`🔍 Geocoding address: "${address}"`);
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      
      console.log(`✅ Geocoding successful: ${location.lat}, ${location.lng}`);
      
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        types: result.types
      };
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.warn(`⚠️ No results found for address: "${address}"`);
      throw new Error(`Location not found: ${address}`);
    } else {
      console.error(`❌ Geocoding API error: ${response.data.status}`);
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }
  } catch (error) {
    console.error('❌ Geocoding error:', error.message);
    
    if (error.response) {
      throw new Error(`Geocoding API error: ${error.response.status}`);
    } else if (error.request) {
      throw new Error('Network error while geocoding');
    } else {
      throw error;
    }
  }
};

// Real reverse geocoding function using Google Maps API
const reverseGeocode = async (latitude, longitude) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log(`🔍 Reverse geocoding coordinates: ${latitude}, ${longitude}`);
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      
      console.log(`✅ Reverse geocoding successful: ${result.formatted_address}`);
      
      return {
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components,
        types: result.types
      };
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.warn(`⚠️ No address found for coordinates: ${latitude}, ${longitude}`);
      return {
        formatted_address: `Location near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        place_id: null,
        address_components: [],
        types: []
      };
    } else {
      console.error(`❌ Reverse geocoding API error: ${response.data.status}`);
      throw new Error(`Reverse geocoding failed: ${response.data.status}`);
    }
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error.message);
    
    return {
      formatted_address: `Location near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      place_id: null,
      address_components: [],
      types: []
    };
  }
};

// Helper function to decode Google's polyline format
function decodePolyline(encoded) {
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return poly;
}

// -------- Original Authentication APIs --------
app.post("/signup", async (req, res) => {
  const {
    role,
    fullName,
    email,
    phoneNumber,
    password,
    gender,
    dateOfBirth,
    address,
    aadharNumber,
    licenseNumber,
    scooterModel,
    profilePhoto,
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const mysqlDate = convertDateFormat(dateOfBirth);

    if (role === "Consumer") {
      // Check for existing consumer (PostgreSQL syntax)
      const checkQuery =
        "SELECT * FROM consumers WHERE email = $1 OR phone = $2 OR aadhar_number = $3";
      
      const checkResult = await db.query(checkQuery, [email, phoneNumber, aadharNumber]);
      
      if (checkResult.rows.length > 0) {
        const existingField =
          checkResult.rows[0].email === email
            ? "email"
            : checkResult.rows[0].phone === phoneNumber
            ? "phone number"
            : "Aadhar number";
        return res
          .status(400)
          .json({ error: `This ${existingField} is already registered` });
      }

      // Insert new consumer (PostgreSQL syntax with RETURNING)
      const query = `
        INSERT INTO consumers 
        (full_name, email, phone, password, gender, date_of_birth, address, aadhar_number, profile_photo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      
      const result = await db.query(query, [
        fullName,
        email,
        phoneNumber,
        hashedPassword,
        gender,
        mysqlDate,
        address,
        aadharNumber,
        profilePhoto,
      ]);
      
      res.status(201).json({
        message: "Consumer registered successfully!",
        userId: result.rows[0].id,
      });
      
    } else if (role === "Driver") {
      // Check for existing driver (PostgreSQL syntax)
      const checkQuery =
        "SELECT * FROM drivers WHERE email = $1 OR phone = $2 OR aadhar_number = $3 OR license_number = $4";
      
      const checkResult = await db.query(checkQuery, [email, phoneNumber, aadharNumber, licenseNumber]);
      
      if (checkResult.rows.length > 0) {
        const existingField =
          checkResult.rows[0].email === email
            ? "email"
            : checkResult.rows[0].phone === phoneNumber
            ? "phone number"
            : checkResult.rows[0].aadhar_number === aadharNumber
            ? "Aadhar number"
            : "license number";
        return res
          .status(400)
          .json({ error: `This ${existingField} is already registered` });
      }

      // Insert new driver (PostgreSQL syntax with RETURNING)
      const query = `
        INSERT INTO drivers
        (full_name, email, phone, password, gender, date_of_birth, address, aadhar_number, license_number, scooter_model, profile_photo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;
      
      const result = await db.query(query, [
        fullName,
        email,
        phoneNumber,
        hashedPassword,
        gender,
        mysqlDate,
        address,
        aadharNumber,
        licenseNumber,
        scooterModel,
        profilePhoto,
      ]);
      
      res.status(201).json({
        message: "Driver registered successfully!",
        userId: result.rows[0].id,
      });
      
    } else {
      res.status(400).json({ error: "Invalid role" });
    }
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { role, email, password } = req.body;

  if (!role || !["Consumer", "Driver"].includes(role)) {
    return res.status(400).json({ error: "Invalid role specified" });
  }
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email/phone and password are required" });
  }

  try {
    const table = role === "Consumer" ? "consumers" : "drivers";
    const query = `SELECT * FROM ${table} WHERE email = $1 OR phone = $2`;

    const result = await db.query(query, [email, email]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Account not found" });
    }

    const user = result.rows[0];
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign({ id: user.id, role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser =
      role === "Driver"
        ? {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            dateOfBirth: user.date_of_birth,
            address: user.address,
            aadharNumber: user.aadhar_number,
            licenseNumber: user.license_number,
            scooterModel: user.scooter_model,
            profilePhoto: user.profile_photo,
            isAvailable: user.is_available,
            role,
          }
        : {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            dateOfBirth: user.date_of_birth,
            address: user.address,
            aadharNumber: user.aadhar_number,
            profilePhoto: user.profile_photo,
            role,
          };

    res.json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed. Try again." });
  }
});

// -------- LOCATION-RELATED APIs WITH GEOHASH --------

// Update User Location (for both consumers and drivers) - WITH GEOHASH
app.post("/api/location/update", authenticateToken, async (req, res) => {
  const { latitude, longitude, address } = req.body;
  const { id, role } = req.user;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "Invalid coordinates" });
  }

  let locationAddress = address;
  
  if (!locationAddress) {
    try {
      const reverseGeoResult = await reverseGeocode(latitude, longitude);
      locationAddress = reverseGeoResult.formatted_address;
      console.log(`📍 Auto-resolved address: ${locationAddress}`);
    } catch (error) {
      console.warn('Failed to reverse geocode, using coordinates as address');
      locationAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }

  try {
    await updateLocationWithGeohash(id, latitude, longitude, locationAddress, role);
    
    res.json({
      message: "Location updated successfully",
      location: { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude), 
        address: locationAddress,
        geohash: generateGeohash(latitude, longitude)
      }
    });
  } catch (error) {
    console.error("Location update error:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// Get User's Current Location
app.get("/api/location/current", authenticateToken, async (req, res) => {
  const { id, role } = req.user;
  const table = role === "Consumer" ? "consumer_locations" : "driver_locations";

  const query = `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`;

  try {
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No location data found" });
    }

    const location = result.rows[0];
    res.json({
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
      address: location.address,
      geohash: location.geohash,
      lastUpdated: location.updated_at
    });
  } catch (err) {
    console.error("Get location error:", err);
    return res.status(500).json({ error: "Failed to fetch location" });
  }
});

// -------- ENHANCED RIDE BOOKING WITH GEOHASH DRIVER QUEUE --------

// Find Nearby Available Drivers - WITH GEOHASH
app.post("/api/rides/find-drivers", authenticateToken, async (req, res) => {
  const { pickupLocation } = req.body;
  const consumerId = req.user.id;

  if (req.user.role !== "Consumer") {
    return res.status(403).json({ error: "Only consumers can search for drivers" });
  }

  if (!pickupLocation?.latitude || !pickupLocation?.longitude) {
    return res.status(400).json({ error: "Pickup location is required" });
  }

  try {
    const userLat = parseFloat(pickupLocation.latitude);
    const userLon = parseFloat(pickupLocation.longitude);
    
    // Get primary geohash and neighboring geohashes
    const primaryGeohash = generateGeohash(userLat, userLon);
    const neighboringGeohashes = getNeighboringGeohashes(userLat, userLon);
    const allGeohashes = [primaryGeohash, ...neighboringGeohashes];
    
    console.log(`🔍 Searching for drivers in geohashes: ${allGeohashes.join(', ')}`);

    // Build geohash query - search in primary geohash first, then neighbors
    let paramIndex = 1;
    const geohashConditions = allGeohashes.map(() => `dl.geohash LIKE $${paramIndex++}`).join(' OR ');
    const geohashParams = allGeohashes.map(hash => `${hash}%`);

    const query = `
      SELECT 
        d.id, d.full_name, d.phone, d.scooter_model, d.profile_photo,
        dl.latitude, dl.longitude, dl.address, dl.updated_at, dl.geohash,
        CASE 
          WHEN dl.geohash LIKE $${paramIndex} THEN 1  -- Primary geohash gets priority
          ELSE 2  -- Neighboring geohashes get lower priority
        END as priority
      FROM drivers d
      INNER JOIN driver_locations dl ON d.id = dl.user_id
      WHERE d.is_available = true
      AND dl.updated_at > NOW() - INTERVAL '30 minutes'
      AND (${geohashConditions})
      ORDER BY priority ASC, dl.updated_at DESC
      LIMIT 10
    `;

    const queryParams = [`${primaryGeohash}%`, ...geohashParams];

    const result = await db.query(query, queryParams);
    const drivers = result.rows;

      const driversWithDistance = drivers
        .map(driver => {
          const driverLat = parseFloat(driver.latitude);
          const driverLon = parseFloat(driver.longitude);
          const distance = calculateDistance(userLat, userLon, driverLat, driverLon);

          return {
            id: driver.id,
            fullName: driver.full_name,
            phone: driver.phone,
            scooterModel: driver.scooter_model,
            profilePhoto: driver.profile_photo,
            location: {
              latitude: driverLat,
              longitude: driverLon,
              address: driver.address
            },
            distanceFromPickup: Math.round(distance * 100) / 100,
            lastSeen: driver.updated_at,
            geohash: driver.geohash,
            priority: driver.priority
          };
        })
        .filter(driver => driver.distanceFromPickup <= 10) // Still filter by distance for accuracy
        .sort((a, b) => {
          // Sort by priority first, then by distance
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.distanceFromPickup - b.distanceFromPickup;
        })
        .slice(0, 3);

      console.log(`\n🚗 === GEOHASH DRIVER SEARCH ===`);
      console.log(`📍 Pickup Location: ${userLat.toFixed(4)}, ${userLon.toFixed(4)}`);
      console.log(`🗺️ Primary Geohash: ${primaryGeohash}`);
      console.log(`👥 Available Drivers Found: ${driversWithDistance.length}\n`);
      
      driversWithDistance.forEach((driver, index) => {
        console.log(`${index + 1}. Driver ID: ${driver.id} | Name: ${driver.fullName}`);
        console.log(`   Distance: ${driver.distanceFromPickup} km | Geohash: ${driver.geohash}`);
        console.log(`   Priority: ${driver.priority === 1 ? 'Primary' : 'Neighbor'}\n`);
      });

      if (driversWithDistance.length === 0) {
        console.log("❌ No available drivers found in nearby geohashes\n");
      }

      res.json({
        success: true,
        drivers: driversWithDistance,
        totalFound: driversWithDistance.length,
        searchRadius: 10,
        geohash: primaryGeohash,
        searchMethod: 'geohash'
      });
  } catch (error) {
    console.error("Find drivers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create Ride Request
app.post("/api/rides/request", authenticateToken, async (req, res) => {
  const { pickupLocation, dropLocation, pickupAddress, dropAddress, driverQueue } = req.body;
  const consumerId = req.user.id;

  if (req.user.role !== "Consumer") {
    return res.status(403).json({ error: "Only consumers can request rides" });
  }

  if (!pickupLocation || !dropLocation || !driverQueue || driverQueue.length === 0) {
    return res.status(400).json({ error: "Invalid ride request data" });
  }

  try {
    const distance = calculateDistance(
      pickupLocation.latitude, pickupLocation.longitude,
      dropLocation.latitude, dropLocation.longitude
    );
    const fare = calculateFare(distance);

    const rideQuery = `
      INSERT INTO rides (
        consumer_id, pickup_latitude, pickup_longitude, pickup_address,
        drop_latitude, drop_longitude, drop_address, distance_km, fare,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
      RETURNING id
    `;

    const rideResult = await db.query(rideQuery, [
      consumerId,
      pickupLocation.latitude, pickupLocation.longitude, pickupAddress,
      dropLocation.latitude, dropLocation.longitude, dropAddress,
      distance, fare
    ]);

      const rideId = rideResult.rows[0].id;

      const rideRequest = {
        rideId,
        consumerId,
        pickupLocation,
        dropLocation,
        pickupAddress,
        dropAddress,
        distance,
        fare,
        driverQueue: [...driverQueue],
        currentDriverIndex: 0,
        status: 'searching',
        createdAt: new Date().toISOString()
      };

      pendingRideRequests.set(rideId, rideRequest);

      console.log(`\n🎯 === RIDE REQUEST CREATED ===`);
      console.log(`Ride ID: ${rideId}`);
      console.log(`Consumer ID: ${consumerId}`);
      console.log(`Distance: ${distance.toFixed(2)} km`);
      console.log(`Fare: ₹${fare}`);
      console.log(`Driver Queue: [${driverQueue.map(d => d.id).join(', ')}]`);
      console.log(`Requesting Driver #1: ID ${driverQueue[0].id} (${driverQueue[0].fullName})\n`);

      startDriverTimeout(rideId);

      res.status(201).json({
        success: true,
        rideId,
        ride: {
          id: rideId,
          pickupLocation,
          dropLocation,
          pickupAddress,
          dropAddress,
          distance: Math.round(distance * 100) / 100,
          fare,
          status: 'searching',
          currentDriver: driverQueue[0],
          queuePosition: 1,
          totalDrivers: driverQueue.length
        }
      });
  } catch (error) {
    console.error("Ride request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to handle driver timeout
function startDriverTimeout(rideId) {
  setTimeout(() => {
    const rideRequest = pendingRideRequests.get(rideId);
    
    if (!rideRequest || rideRequest.status !== 'searching') {
      return;
    }

    console.log(`\n⏰ === DRIVER TIMEOUT ===`);
    console.log(`Ride ID: ${rideId}`);
    console.log(`Driver ${rideRequest.driverQueue[rideRequest.currentDriverIndex].id} did not respond\n`);

    moveToNextDriver(rideId);
  }, RIDE_REQUEST_TIMEOUT);
}

// Move to next driver in queue
async function moveToNextDriver(rideId) {
  const rideRequest = pendingRideRequests.get(rideId);
  
  if (!rideRequest) return;

  rideRequest.currentDriverIndex++;

  if (rideRequest.currentDriverIndex >= rideRequest.driverQueue.length) {
    console.log(`\n❌ === NO DRIVERS AVAILABLE ===`);
    console.log(`Ride ID: ${rideId} - All drivers exhausted\n`);
    
    rideRequest.status = 'no_drivers';
    
    await db.query(
      "UPDATE rides SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1",
      [rideId]
    );
    
    return;
  }

  const nextDriver = rideRequest.driverQueue[rideRequest.currentDriverIndex];
  console.log(`\n➡️ === MOVING TO NEXT DRIVER ===`);
  console.log(`Ride ID: ${rideId}`);
  console.log(`Next Driver: #${rideRequest.currentDriverIndex + 1} - ID ${nextDriver.id} (${nextDriver.fullName})\n`);

  startDriverTimeout(rideId);
}

// Get Pending Rides for Driver
app.get("/api/driver/pending-rides", authenticateToken, (req, res) => {
  const driverId = req.user.id;

  if (req.user.role !== "Driver") {
    return res.status(403).json({ error: "Only drivers can view pending rides" });
  }

  const pendingRides = [];

  for (const [rideId, rideRequest] of pendingRideRequests.entries()) {
    if (rideRequest.status === 'searching') {
      const currentDriver = rideRequest.driverQueue[rideRequest.currentDriverIndex];
      
      if (currentDriver.id === driverId) {
        const distanceToPickup = currentDriver.distanceFromPickup;

        pendingRides.push({
          rideId,
          pickupLocation: rideRequest.pickupLocation,
          dropLocation: rideRequest.dropLocation,
          pickupAddress: rideRequest.pickupAddress,
          dropAddress: rideRequest.dropAddress,
          distanceToPickup: Math.round(distanceToPickup * 100) / 100,
          totalDistance: Math.round(rideRequest.distance * 100) / 100,
          fare: rideRequest.fare,
          queuePosition: rideRequest.currentDriverIndex + 1,
          createdAt: rideRequest.createdAt
        });
      }
    }
  }

  res.json({
    success: true,
    pendingRides,
    count: pendingRides.length
  });
});

// Accept Ride
// Auto-complete ride after 5 minutes (POC simulation)
app.post("/api/rides/:rideId/accept", authenticateToken, async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user.id;

  if (req.user.role !== "Driver") {
    return res.status(403).json({ error: "Only drivers can accept rides" });
  }

  const rideRequest = pendingRideRequests.get(parseInt(rideId));

  if (!rideRequest) {
    return res.status(404).json({ error: "Ride request not found or expired" });
  }

  if (rideRequest.status !== 'searching') {
    return res.status(400).json({ error: "Ride is no longer available" });
  }

  const currentDriver = rideRequest.driverQueue[rideRequest.currentDriverIndex];

  if (currentDriver.id !== driverId) {
    return res.status(403).json({ error: "This ride is not assigned to you" });
  }

  const updateQuery = `
    UPDATE rides 
    SET driver_id = $1, status = 'accepted', accepted_at = NOW() 
    WHERE id = $2 AND status = 'pending'
  `;

  try {
    const result = await db.query(updateQuery, [driverId, rideId]);

    if (result.rowCount === 0) {
      return res.status(409).json({ error: "Ride was already accepted" });
    }

    rideRequest.status = 'accepted';
    rideRequest.acceptedDriverId = driverId;

    console.log(`\n✅ === RIDE ACCEPTED ===`);
    console.log(`Ride ID: ${rideId}`);
    console.log(`Driver ID: ${driverId} (${currentDriver.fullName})`);
    console.log(`Distance to Pickup: ${currentDriver.distanceFromPickup} km`);
    console.log(`Total Trip Distance: ${rideRequest.distance.toFixed(2)} km`);
    console.log(`Fare: ₹${rideRequest.fare}\n`);

   // Lines 830-854 - Replace with this improved version:

// 🚗 POC AUTO-SIMULATION: Complete ride after 5 minutes
console.log(`🤖 [POC] Auto-completing ride in 5 minutes...`);

// Capture rideId explicitly to avoid any closure issues
const capturedRideId = parseInt(rideId);

// Step 1: Auto-start ride after 30 seconds
const startTimeout = setTimeout(async () => {
  console.log(`🚗 [POC] Auto-starting ride ${capturedRideId}...`);
  try {
    const result = await db.query(
      "UPDATE rides SET status = 'in_progress', started_at = NOW() WHERE id = $1 AND status = 'accepted'",
      [capturedRideId]
    );
    if (result.rowCount > 0) {
      console.log(`🚗 [POC] Ride ${capturedRideId} auto-started successfully`);
    } else {
      console.warn(`⚠️ Could not auto-start ride ${capturedRideId} - status may have changed`);
    }
  } catch (err) {
    console.error(`❌ Failed to auto-start ride ${capturedRideId}:`, err);
  }
}, 30000); // 30 seconds

// Step 2: Auto-complete ride after 5 minutes
const completeTimeout = setTimeout(async () => {
  console.log(`✅ [POC] Auto-completing ride ${capturedRideId}...`);
  try {
    const result = await db.query(
      "UPDATE rides SET status = 'completed', completed_at = NOW() WHERE id = $1 AND status IN ('accepted', 'in_progress')",
      [capturedRideId]
    );
    if (result.rowCount > 0) {
      console.log(`✅ [POC] Ride ${capturedRideId} auto-completed and added to history`);
      pendingRideRequests.delete(capturedRideId);
    } else {
      console.warn(`⚠️ Could not auto-complete ride ${capturedRideId} - ride may not exist or already completed`);
    }
  } catch (err) {
    console.error(`❌ Failed to auto-complete ride ${capturedRideId}:`, err);
  }
}, 300000); // 5 minutes (300 seconds)

// Store timeout IDs in case we need to cancel them
if (!global.pocTimeouts) {
  global.pocTimeouts = new Map();
}
global.pocTimeouts.set(capturedRideId, { startTimeout, completeTimeout });

    const locResult = await db.query(
      "SELECT latitude, longitude, address FROM driver_locations WHERE user_id = $1",
      [driverId]
    );
    const driverLocation = locResult.rows.length > 0 
      ? {
          latitude: parseFloat(locResult.rows[0].latitude),
          longitude: parseFloat(locResult.rows[0].longitude),
          address: locResult.rows[0].address
        }
      : currentDriver.location;

        const distanceToPickup = currentDriver.distanceFromPickup;
        const etaToPickupMinutes = Math.round((distanceToPickup / 25) * 60); // Assuming 25 km/h average speed

        res.json({
          success: true,
          message: "Ride accepted successfully",
          ride: {
            rideId: parseInt(rideId),
            driverLocation,
            pickupLocation: rideRequest.pickupLocation,
            dropLocation: rideRequest.dropLocation,
            pickupAddress: rideRequest.pickupAddress,
            dropAddress: rideRequest.dropAddress,
            distanceToPickup: Math.round(currentDriver.distanceFromPickup * 100) / 100,
            totalDistance: Math.round(rideRequest.distance * 100) / 100,
            fare: rideRequest.fare,
            etaToPickup: etaToPickupMinutes,
            status: 'accepted',
            autoCompleteIn: 300 // 5 minutes in seconds
          }
        });
  } catch (error) {
    console.error("Accept ride error:", error);
    res.status(500).json({ error: "Failed to accept ride" });
  }
});

// Reject Ride
app.post("/api/rides/:rideId/reject", authenticateToken, (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user.id;

  if (req.user.role !== "Driver") {
    return res.status(403).json({ error: "Only drivers can reject rides" });
  }

  const rideRequest = pendingRideRequests.get(parseInt(rideId));

  if (!rideRequest || rideRequest.status !== 'searching') {
    return res.status(404).json({ error: "Ride request not found" });
  }

  const currentDriver = rideRequest.driverQueue[rideRequest.currentDriverIndex];

  if (currentDriver.id !== driverId) {
    return res.status(403).json({ error: "This ride is not assigned to you" });
  }

  console.log(`\n❌ === RIDE REJECTED ===`);
  console.log(`Ride ID: ${rideId}`);
  console.log(`Driver ID: ${driverId} (${currentDriver.fullName})\n`);

  moveToNextDriver(parseInt(rideId));

  res.json({
    success: true,
    message: "Ride rejected, moving to next driver"
  });
});

// Get Ride Status
app.get("/api/rides/:rideId/status", authenticateToken, async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user.id;

  const rideRequest = pendingRideRequests.get(parseInt(rideId));

  if (!rideRequest) {
    try {
      const result = await db.query("SELECT * FROM rides WHERE id = $1", [rideId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Ride not found" });
      }

      const ride = result.rows[0];
      res.json({
        success: true,
        status: ride.status,
        rideId: parseInt(rideId),
        driverId: ride.driver_id
      });
    } catch (error) {
      console.error("Get ride status error:", error);
      res.status(500).json({ error: "Failed to fetch ride status" });
    }
    return;
  }

  if (rideRequest.consumerId !== userId && req.user.role === 'Consumer') {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const currentDriver = rideRequest.driverQueue[rideRequest.currentDriverIndex];

  res.json({
    success: true,
    status: rideRequest.status,
    rideId: parseInt(rideId),
    currentDriver: rideRequest.status === 'searching' ? {
      id: currentDriver.id,
      name: currentDriver.fullName,
      queuePosition: rideRequest.currentDriverIndex + 1,
      totalDrivers: rideRequest.driverQueue.length
    } : null,
    acceptedDriverId: rideRequest.acceptedDriverId || null
  });
});

// Get Active Ride for Consumer or Driver
app.get("/api/rides/active", authenticateToken, async (req, res) => {
  const { id, role } = req.user;

  const query = role === "Consumer"
    ? `
      SELECT 
        r.*, 
        d.full_name as driver_name, 
        d.phone as driver_phone, 
        d.scooter_model,
        d.profile_photo as driver_photo,
        dl.latitude as driver_latitude,
        dl.longitude as driver_longitude
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN driver_locations dl ON d.id = dl.user_id
      WHERE r.consumer_id = $1 
      AND r.status IN ('accepted', 'in_progress')
      ORDER BY r.created_at DESC
      LIMIT 1
    `
    : `
      SELECT 
        r.*, 
        c.full_name as consumer_name, 
        c.phone as consumer_phone
      FROM rides r
      LEFT JOIN consumers c ON r.consumer_id = c.id
      WHERE r.driver_id = $1 
      AND r.status IN ('accepted', 'in_progress')
      ORDER BY r.created_at DESC
      LIMIT 1
    `;

  try {
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.json({ success: true, ride: null });
    }

    const ride = result.rows[0];
    
    const rideData = {
      id: ride.id,
      pickup: {
        latitude: parseFloat(ride.pickup_latitude),
        longitude: parseFloat(ride.pickup_longitude),
        address: ride.pickup_address
      },
      drop: {
        latitude: parseFloat(ride.drop_latitude),
        longitude: parseFloat(ride.drop_longitude),
        address: ride.drop_address
      },
      distance: parseFloat(ride.distance_km),
      fare: parseFloat(ride.fare),
      status: ride.status,
      createdAt: ride.created_at,
      acceptedAt: ride.accepted_at,
      startedAt: ride.started_at,
    };

    if (role === "Consumer") {
      rideData.driver = ride.driver_id ? {
        id: ride.driver_id,
        name: ride.driver_name,
        phone: ride.driver_phone,
        scooterModel: ride.scooter_model,
        profilePhoto: ride.driver_photo,
        location: ride.driver_latitude && ride.driver_longitude ? {
          latitude: parseFloat(ride.driver_latitude),
          longitude: parseFloat(ride.driver_longitude),
        } : null
      } : null;
    } else {
      rideData.consumer = {
        name: ride.consumer_name,
        phone: ride.consumer_phone
      };
    }

    res.json({
      success: true,
      ride: rideData
    });
  } catch (err) {
    console.error("Get active ride error:", err);
    return res.status(500).json({ error: "Failed to fetch active ride" });
  }
});

// Get User's Ride History
app.get("/api/rides/history", authenticateToken, async (req, res) => {
  const { id, role } = req.user;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query, params;

  if (role === "Consumer") {
    query = `
      SELECT 
        r.*, d.full_name as driver_name, d.phone as driver_phone, d.scooter_model
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE r.consumer_id = $1 AND r.status = 'completed'
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    params = [id, parseInt(limit), parseInt(offset)];
  } else {
    query = `
      SELECT 
        r.*, c.full_name as consumer_name, c.phone as consumer_phone
      FROM rides r
      LEFT JOIN consumers c ON r.consumer_id = c.id
      WHERE r.driver_id = $1 AND r.status = 'completed'
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    params = [id, parseInt(limit), parseInt(offset)];
  }

  try {
    const result = await db.query(query, params);

    const rides = result.rows.map(ride => ({
      id: ride.id,
      pickup: {
        latitude: parseFloat(ride.pickup_latitude),
        longitude: parseFloat(ride.pickup_longitude),
        address: ride.pickup_address
      },
      drop: {
        latitude: parseFloat(ride.drop_latitude),
        longitude: parseFloat(ride.drop_longitude),
        address: ride.drop_address
      },
      distance: parseFloat(ride.distance_km),
      fare: ride.fare,
      status: ride.status,
      createdAt: ride.created_at,
      startedAt: ride.started_at,
      completedAt: ride.completed_at,
      ...(role === "Consumer" ? {
        driver: ride.driver_id ? {
          name: ride.driver_name,
          phone: ride.driver_phone,
          scooterModel: ride.scooter_model
        } : null
      } : {
        consumer: {
          name: ride.consumer_name,
          phone: ride.consumer_phone
        }
      })
    }));

    res.json({
      rides,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rides.length
      }
    });
  } catch (err) {
    console.error("Ride history error:", err);
    return res.status(500).json({ error: "Failed to fetch ride history" });
  }
});

// Start Ride
app.post("/api/rides/:rideId/start", authenticateToken, async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user.id;

  if (req.user.role !== "Driver") {
    return res.status(403).json({ error: "Only drivers can start rides" });
  }

  const updateQuery = `
    UPDATE rides 
    SET status = 'in_progress', started_at = NOW() 
    WHERE id = $1 AND driver_id = $2 AND status = 'accepted'
  `;

  try {
    const result = await db.query(updateQuery, [rideId, driverId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ride not found or cannot be started" });
    }

    res.json({
      message: "Ride started successfully",
      rideId: parseInt(rideId)
    });
  } catch (error) {
    console.error("Start ride error:", error);
    res.status(500).json({ error: "Failed to start ride" });
  }
});

// Complete Ride
app.post("/api/rides/:rideId/complete", authenticateToken, async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user.id;

  if (req.user.role !== "Driver") {
    return res.status(403).json({ error: "Only drivers can complete rides" });
  }

  const updateQuery = `
    UPDATE rides 
    SET status = 'completed', completed_at = NOW() 
    WHERE id = $1 AND driver_id = $2 AND status = 'in_progress'
  `;

  try {
    const result = await db.query(updateQuery, [rideId, driverId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ride not found or cannot be completed" });
    }

    res.json({
      message: "Ride completed successfully",
      rideId: parseInt(rideId)
    });
  } catch (error) {
    console.error("Complete ride error:", error);
    res.status(500).json({ error: "Failed to complete ride" });
  }
});

// -------- GOOGLE MAPS APIs --------

// Geocode Address
app.post("/api/geocode", authenticateToken, async (req, res) => {
  const { address } = req.body;

  if (!address || !address.trim()) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    const result = await geocodeAddress(address.trim());
    
    res.json({
      success: true,
      address: address.trim(),
      coordinates: {
        latitude: result.lat,
        longitude: result.lng
      },
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      types: result.types
    });
  } catch (error) {
    console.error("Geocoding error:", error.message);
    
    res.status(400).json({ 
      success: false,
      error: error.message || "Failed to geocode address",
      address: address.trim()
    });
  }
});

// Reverse Geocode
app.post("/api/reverse-geocode", authenticateToken, async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "Invalid coordinates" });
  }

  try {
    const result = await reverseGeocode(latitude, longitude);

    res.json({
      success: true,
      coordinates: { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      },
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      address_components: result.address_components,
      types: result.types
    });
  } catch (error) {
    console.error("Reverse geocoding error:", error.message);
    
    res.json({
      success: false,
      coordinates: { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      },
      formatted_address: `Location near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      place_id: null,
      error: error.message
    });
  }
});

// Get Directions
app.post("/api/directions", authenticateToken, async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: "Origin and destination are required" });
  }

  try {
    const originEncoded = encodeURIComponent(origin.trim());
    const destinationEncoded = encodeURIComponent(destination.trim());
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originEncoded}&destination=${destinationEncoded}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;
    
    console.log(`🗺️ Getting directions from "${origin}" to "${destination}"`);
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      const points = decodePolyline(route.overview_polyline.points);
      
      res.json({
        success: true,
        route: {
          coordinates: points,
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value,
          durationValue: leg.duration.value,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          startLocation: leg.start_location,
          endLocation: leg.end_location,
        }
      });
    } else if (response.data.status === 'ZERO_RESULTS') {
      res.status(404).json({
        success: false,
        error: 'No route found between these locations'
      });
    } else {
      console.error(`❌ Directions API error: ${response.data.status}`);
      res.status(400).json({
        success: false,
        error: `Failed to get directions: ${response.data.status}`
      });
    }
  } catch (error) {
    console.error('Directions API error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch directions'
    });
  }
});

// Places Autocomplete
app.post("/api/places/autocomplete", authenticateToken, async (req, res) => {
  const { input, location, radius = 50000 } = req.body;

  if (!input || !input.trim()) {
    return res.status(400).json({ error: "Search input is required" });
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input.trim())}&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (location && location.latitude && location.longitude) {
      url += `&location=${location.latitude},${location.longitude}&radius=${radius}`;
    }
    
    url += '&components=country:in';
    
    console.log(`🔍 Places autocomplete for: "${input}"`);
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK') {
      const suggestions = response.data.predictions.map(prediction => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text: prediction.structured_formatting.main_text,
        secondary_text: prediction.structured_formatting.secondary_text,
        types: prediction.types
      }));

      res.json({
        success: true,
        suggestions,
        status: response.data.status
      });
    } else {
      console.warn(`⚠️ Places API warning: ${response.data.status}`);
      res.json({
        success: false,
        suggestions: [],
        status: response.data.status,
        error: response.data.error_message || 'No suggestions found'
      });
    }
  } catch (error) {
    console.error('Places autocomplete error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch place suggestions',
      suggestions: []
    });
  }
});

// Get Place Details
app.post("/api/places/details", authenticateToken, async (req, res) => {
  const { place_id } = req.body;

  if (!place_id) {
    return res.status(400).json({ error: "Place ID is required" });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=geometry,formatted_address,name,types&key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log(`📍 Getting place details for: ${place_id}`);
    
    const response = await axios.get(url);
    
    if (response.data.status === 'OK') {
      const place = response.data.result;
      
      res.json({
        success: true,
        place_id: place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        coordinates: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        types: place.types
      });
    } else {
      console.error(`❌ Place details API error: ${response.data.status}`);
      res.status(400).json({
        success: false,
        error: `Failed to get place details: ${response.data.status}`,
        place_id: place_id
      });
    }
  } catch (error) {
    console.error('Place details error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch place details'
    });
  }
});

// -------- PROFILE APIs --------

app.get("/profile/:role/:id", authenticateToken, async (req, res) => {
  const { role, id } = req.params;
  if (!["Consumer", "Driver"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  if (req.user.role !== role || req.user.id != id) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  const table = role === "Consumer" ? "consumers" : "drivers";
  const query = `SELECT * FROM ${table} WHERE id = $1`;

  try {
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    const safeUser = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.date_of_birth,
      address: user.address,
      profilePhoto: user.profile_photo,
      role,
    };

    res.json({ user: safeUser });
  } catch (error) {
    console.error("Fetch profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.put("/driver/:id/availability", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  if (req.user.role !== "Driver" || req.user.id != id) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const query = "UPDATE drivers SET is_available = $1 WHERE id = $2";
  try {
    await db.query(query, [isAvailable, id]);
    res.json({ message: "Availability updated successfully", isAvailable });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

app.get("/api/driver/profile", authenticateToken, async (req, res) => {
  console.log("Decoded JWT:", req.user);

  if (req.user.role !== "Driver") {
    return res.status(403).json({ error: "Access denied. Not a driver account" });
  }

  const query = `SELECT * FROM drivers WHERE id = $1`;
  console.log("Fetching driver with ID:", req.user.id);

  try {
    const result = await db.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      console.log("No driver found with ID:", req.user.id);
      return res.status(404).json({ error: "Driver not found" });
    }

    const driver = result.rows[0];
    res.json({
      id: driver.id,
      fullName: driver.full_name,
      email: driver.email,
      phone: driver.phone,
      gender: driver.gender,
      dateOfBirth: driver.date_of_birth,
      address: driver.address,
      aadharNumber: driver.aadhar_number,
      licenseNumber: driver.license_number,
      scooterModel: driver.scooter_model,
      profilePhoto: driver.profile_photo,
      isAvailable: driver.is_available,
      role: "Driver",
    });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});
// ===== FEEDBACK APIs =====

// Submit feedback
app.post("/api/feedback/submit", authenticateToken, async (req, res) => {
  const {
    rideId,
    userType, // 'driver' | 'customer'
    overallRating,
    cleanlinessRating = 0,
    safetyRating = 0,
    communicationRating = 0,
    punctualityRating = 0,
    comments = null,
    tags = null, // array
  } = req.body;

  if (!rideId || !userType || !['driver','customer'].includes(userType) || !overallRating) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    // Verify ride exists and the caller is part of this ride
    const verifyQuery = `
      SELECT r.id, r.consumer_id, r.driver_id, r.status
      FROM rides r
      WHERE r.id = $1
      LIMIT 1
    `;
    const vResult = await db.query(verifyQuery, [rideId]);
    if (vResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    const ride = vResult.rows[0];
    const callerId = req.user.id;

    if (userType === 'customer') {
      if (ride.consumer_id !== callerId) {
        return res.status(403).json({ success: false, error: "Not your ride" });
      }
    } else {
      if (ride.driver_id !== callerId) {
        return res.status(403).json({ success: false, error: "Not your ride" });
      }
    }

    // Optional: only allow feedback on completed rides
    // if (ride.status !== 'completed') return res.status(400).json({ success:false, error: "Ride not completed" });

    // Prevent duplicate feedback per ride per userType
    const existsQuery = `
      SELECT id FROM feedback
      WHERE ride_id = $1 AND user_type = $2
      LIMIT 1
    `;
    const eResult = await db.query(existsQuery, [rideId, userType]);
    if (eResult.rows.length > 0) {
      return res.status(409).json({ success: false, error: "Feedback already submitted" });
    }

    const insertQuery = `
      INSERT INTO feedback
      (ride_id, user_id, user_type, overall_rating, cleanliness_rating, safety_rating, communication_rating, punctuality_rating, comments, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id
    `;
    const tagsJson = tags ? JSON.stringify(tags) : null;
    const insertResult = await db.query(
      insertQuery,
      [rideId, callerId, userType, overallRating, cleanlinessRating, safetyRating, communicationRating, punctualityRating, comments, tagsJson]
    );
    
    return res.json({ success: true, id: insertResult.rows[0].id });
  } catch (error) {
    console.error("Submit feedback error:", error);
    return res.status(500).json({ success: false, error: "Failed to save feedback" });
  }
});

// Get feedback for a ride (both sides)
app.get("/api/feedback/ride/:rideId", authenticateToken, async (req, res) => {
  const { rideId } = req.params;
  const q = `
    SELECT f.*, u.full_name as user_name
    FROM feedback f
    LEFT JOIN consumers c ON (f.user_type = 'customer' AND c.id = f.user_id)
    LEFT JOIN drivers d   ON (f.user_type = 'driver'   AND d.id = f.user_id)
    LEFT JOIN (
      SELECT id, full_name FROM consumers
      UNION ALL
      SELECT id, full_name FROM drivers
    ) u ON u.id = f.user_id
    WHERE f.ride_id = $1
    ORDER BY f.created_at ASC
  `;
  try {
    const result = await db.query(q, [rideId]);
    const data = result.rows.map(r => ({
      id: r.id,
      rideId: r.ride_id,
      userId: r.user_id,
      userType: r.user_type,
      overallRating: r.overall_rating,
      cleanlinessRating: r.cleanliness_rating,
      safetyRating: r.safety_rating,
      communicationRating: r.communication_rating,
      punctualityRating: r.punctuality_rating,
      comments: r.comments,
      tags: r.tags ? JSON.parse(r.tags) : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userName: r.user_name || null,
    }));
    res.json({ success: true, feedback: data });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({ success: false, error: "DB error" });
  }
});

// Get aggregate rating for a driver (optional utility)
app.get("/api/feedback/driver/:driverId/summary", async (req, res) => {
  const { driverId } = req.params;
  const q = `
    SELECT 
      COUNT(*) as total, 
      AVG(overall_rating) as avgOverall
    FROM feedback f
    INNER JOIN rides r ON r.id = f.ride_id
    WHERE r.driver_id = $1 AND f.user_type = 'customer'
  `;
  try {
    const result = await db.query(q, [driverId]);
    const row = result.rows[0] || { total: 0, avgOverall: null };
    res.json({ success: true, total: row.total, avgOverall: row.avgOverall });
  } catch (error) {
    console.error("Get driver summary error:", error);
    res.status(500).json({ success: false, error: "DB error" });
  }
});
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
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Something went wrong!" });
});

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

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
  console.log(`   ✓ Geohash precision: ${GEOHASH_PRECISION} (~1.2km accuracy)\n`);
});
