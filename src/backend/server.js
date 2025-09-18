// server.js - JWT integrated version

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db"); // Your db.js connection file

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "3cd55083223f2738ec3b05d633a6c3e5559d153c6aabf1eab3438e2ece9188adc5bb5701b468f51c08e95c8b1a2522154b5863d0f3e7e5f8d444e84fb3e873bf"; // Use dotenv in production

// -------- Middleware --------
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://10.0.2.2:3000",
      "http://127.0.0.1:3000",
      "http://10.28.44.126:3000",
      "http://10.28.44.126:5000",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" })); // handles JSON & base64 images

// -------- JWT Middleware --------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Expect Bearer <token>

  if (!token)
    return res.status(401).json({ error: "Access denied. Token missing" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user; // decoded token payload
    next();
  });
};

// -------- Utility --------
const convertDateFormat = (ddmmyyyy) => {
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

// -------- Signup API --------
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
      const checkQuery =
        "SELECT * FROM consumers WHERE email = ? OR phone = ? OR aadhar_number = ?";
      db.query(checkQuery, [email, phoneNumber, aadharNumber], (checkErr, existing) => {
        if (checkErr)
          return res.status(500).json({ error: "Registration failed. Try again." });

        if (existing.length > 0) {
          const existingField =
            existing[0].email === email
              ? "email"
              : existing[0].phone === phoneNumber
              ? "phone number"
              : "Aadhar number";
          return res
            .status(400)
            .json({ error: `This ${existingField} is already registered` });
        }

        const query = `
          INSERT INTO consumers 
          (full_name, email, phone, password, gender, date_of_birth, address, aadhar_number, profile_photo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(
          query,
          [
            fullName,
            email,
            phoneNumber,
            hashedPassword,
            gender,
            mysqlDate,
            address,
            aadharNumber,
            profilePhoto,
          ],
          (err, result) => {
            if (err)
              return res
                .status(500)
                .json({ error: "Registration failed. Try again." });
            res
              .status(201)
              .json({
                message: "Consumer registered successfully!",
                userId: result.insertId,
              });
          }
        );
      });
    } else if (role === "Driver") {
      const checkQuery =
        "SELECT * FROM drivers WHERE email = ? OR phone = ? OR aadhar_number = ? OR license_number = ?";
      db.query(
        checkQuery,
        [email, phoneNumber, aadharNumber, licenseNumber],
        (checkErr, existing) => {
          if (checkErr)
            return res.status(500).json({ error: "Registration failed. Try again." });

          if (existing.length > 0) {
            const existingField =
              existing[0].email === email
                ? "email"
                : existing[0].phone === phoneNumber
                ? "phone number"
                : existing[0].aadhar_number === aadharNumber
                ? "Aadhar number"
                : "license number";
            return res
              .status(400)
              .json({ error: `This ${existingField} is already registered` });
          }

          const query = `
            INSERT INTO drivers
            (full_name, email, phone, password, gender, date_of_birth, address, aadhar_number, license_number, scooter_model, profile_photo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(
            query,
            [
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
            ],
            (err, result) => {
              if (err)
                return res
                  .status(500)
                  .json({ error: "Registration failed. Try again." });
              res
                .status(201)
                .json({
                  message: "Driver registered successfully!",
                  userId: result.insertId,
                });
            }
          );
        }
      );
    } else {
      res.status(400).json({ error: "Invalid role" });
    }
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------- Login API with JWT --------
app.post("/login", (req, res) => {
  const { role, email, password } = req.body;

  if (!role || !["Consumer", "Driver"].includes(role)) {
    return res.status(400).json({ error: "Invalid role specified" });
  }
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email/phone and password are required" });
  }

  const table = role === "Consumer" ? "consumers" : "drivers";
  const query = `SELECT * FROM ${table} WHERE email = ? OR phone = ?`;

  db.query(query, [email, email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Login failed. Try again." });
    if (results.length === 0)
      return res.status(400).json({ error: "Account not found" });

    const user = results[0];
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid password" });

      // Create JWT
      const token = jwt.sign({ id: user.id, role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // Return safe user object
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

      res.json({
        message: "Login successful",
        token,
        user: safeUser,
      });
    } catch (compareError) {
      console.error("Password comparison error:", compareError);
      return res.status(500).json({ error: "Login failed. Try again." });
    }
  });
});

// -------- Protected Profile API --------
app.get("/profile/:role/:id", authenticateToken, (req, res) => {
  const { role, id } = req.params;
  if (!["Consumer", "Driver"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  // Ensure token matches requested profile
  if (req.user.role !== role || req.user.id != id) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  const table = role === "Consumer" ? "consumers" : "drivers";
  const query = `SELECT * FROM ${table} WHERE id = ?`;

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch profile" });
    if (results.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user = results[0];
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
  });
});

// -------- Health Check --------
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    server: "SoberFolks API",
  });
});

// -------- Error Handling --------
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Something went wrong!" });
});

// -------- 404 Handler --------
app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// -------- Start Server --------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ SoberFolks API running at http://0.0.0.0:${PORT}`);
});
