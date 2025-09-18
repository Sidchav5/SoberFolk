// server.js - Corrected version
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db'); // Your existing db.js file

const app = express();
const PORT = 5000;

// Enhanced CORS configuration
// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://10.0.2.2:3000', 
    'http://127.0.0.1:3000',
    'http://10.28.44.126:3000', // Add your actual IP here
    'http://10.28.44.126:5000'  // Add this too
  ],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' })); // for base64 images

// Validation middleware
const validateSignup = (req, res, next) => {
  const { 
    role, fullName, email, phoneNumber, password, gender, 
    dateOfBirth, address, aadharNumber, licenseNumber, scooterModel 
  } = req.body;

  const errors = [];

  // Basic validation
  if (!role || !['Consumer', 'Driver'].includes(role)) {
    errors.push('Invalid role specified');
  }

  if (!fullName || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errors.push('Invalid email format');
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
    errors.push('Phone number must be exactly 10 digits');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
    errors.push('Invalid gender specified');
  }

  if (!dateOfBirth || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
    errors.push('Date of birth must be in DD/MM/YYYY format');
  } else {
    // Check age (18+)
    const [day, month, year] = dateOfBirth.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      errors.push('Must be at least 18 years old');
    }
  }

  if (!address || address.trim().length < 10) {
    errors.push('Address must be at least 10 characters');
  }

  if (!aadharNumber || !/^\d{12}$/.test(aadharNumber)) {
    errors.push('Aadhar number must be exactly 12 digits');
  }

  // Driver-specific validation
  if (role === 'Driver') {
    if (!licenseNumber || licenseNumber.trim().length < 5) {
      errors.push('License number must be at least 5 characters');
    }

    if (!scooterModel || scooterModel.trim().length < 2) {
      errors.push('Scooter model must be at least 2 characters');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  next();
};

// Utility function to convert DD/MM/YYYY to MySQL date format
const convertDateFormat = (ddmmyyyy) => {
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// -------- Enhanced Signup API --------
app.post('/signup', validateSignup, async (req, res) => {
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
    profilePhoto
  } = req.body;

  try {
    // Hash password with stronger salt
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Convert date format for MySQL
    const mysqlDate = convertDateFormat(dateOfBirth);

    if (role === 'Consumer') {
      // Check for existing records
      const checkQuery = 'SELECT * FROM consumers WHERE email = ? OR phone = ? OR aadhar_number = ?';
      db.query(checkQuery, [email, phoneNumber, aadharNumber], (checkErr, existing) => {
        if (checkErr) {
          console.error('Database check error:', checkErr);
          return res.status(500).json({ error: 'Registration failed. Please try again.' });
        }

        if (existing.length > 0) {
          const existingField = existing[0].email === email ? 'email' : 
                              existing[0].phone === phoneNumber ? 'phone number' : 'Aadhar number';
          return res.status(400).json({ error: `This ${existingField} is already registered` });
        }

        // Insert new consumer
        const query = `
          INSERT INTO consumers 
          (full_name, email, phone, password, gender, date_of_birth, address, aadhar_number, profile_photo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(
          query,
          [fullName, email, phoneNumber, hashedPassword, gender, mysqlDate, address, aadharNumber, profilePhoto],
          (err, result) => {
            if (err) {
              console.error('Consumer registration error:', err);
              return res.status(500).json({ error: 'Registration failed. Please try again.' });
            }
            res.status(201).json({ 
              message: 'Consumer registered successfully!',
              userId: result.insertId 
            });
          }
        );
      });
    } else if (role === 'Driver') {
      // Check for existing records
      const checkQuery = 'SELECT * FROM drivers WHERE email = ? OR phone = ? OR aadhar_number = ? OR license_number = ?';
      db.query(checkQuery, [email, phoneNumber, aadharNumber, licenseNumber], (checkErr, existing) => {
        if (checkErr) {
          console.error('Database check error:', checkErr);
          return res.status(500).json({ error: 'Registration failed. Please try again.' });
        }

        if (existing.length > 0) {
          const existingField = existing[0].email === email ? 'email' : 
                              existing[0].phone === phoneNumber ? 'phone number' :
                              existing[0].aadhar_number === aadharNumber ? 'Aadhar number' : 'license number';
          return res.status(400).json({ error: `This ${existingField} is already registered` });
        }

        // Insert new driver
        const query = `
          INSERT INTO drivers
          (full_name, email, phone, password, gender, date_of_birth, address, aadhar_number, license_number, scooter_model, profile_photo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(
          query,
          [fullName, email, phoneNumber, hashedPassword, gender, mysqlDate, address, aadharNumber, licenseNumber, scooterModel, profilePhoto],
          (err, result) => {
            if (err) {
              console.error('Driver registration error:', err);
              return res.status(500).json({ error: 'Registration failed. Please try again.' });
            }
            res.status(201).json({ 
              message: 'Driver registered successfully!',
              userId: result.insertId 
            });
          }
        );
      });
    } else {
      res.status(400).json({ error: 'Invalid role' });
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------- Enhanced Login API --------
app.post('/login', (req, res) => {
  const { role, email, password } = req.body;

  // Enhanced validation
  if (!role || !['Consumer', 'Driver'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/phone and password are required' });
  }

  const table = role === 'Consumer' ? 'consumers' : 'drivers';

  // Support both email and phone login
  const query = `SELECT * FROM ${table} WHERE email = ? OR phone = ?`;
  
  db.query(query, [email, email], async (err, results) => {
    if (err) {
      console.error('Login database error:', err);
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
    
    if (results.length === 0) {
      return res.status(400).json({ error: 'Account not found' });
    }

    const user = results[0];
    
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid password' });
      }

      // Remove sensitive data before sending response
      delete user.password;
      delete user.aadhar_number;
      
      // Add role to user object
      user.role = role;

      res.json({ 
        message: 'Login successful', 
        user: user 
      });
    } catch (compareError) {
      console.error('Password comparison error:', compareError);
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  });
});

// -------- Health Check API --------
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'SoberFolks API'
  });
});

// -------- Get User Profile API --------
app.get('/profile/:role/:id', (req, res) => {
  const { role, id } = req.params;
  
  if (!['Consumer', 'Driver'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const table = role === 'Consumer' ? 'consumers' : 'drivers';
  const query = `SELECT * FROM ${table} WHERE id = ?`;
  
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = results[0];
    delete user.password;
    delete user.aadhar_number;
    user.role = role;
    
    res.json({ user });
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler - FIXED VERSION
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SoberFolks API Server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Database: Connected to Railway MySQL`);
});