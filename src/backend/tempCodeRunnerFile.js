// server.js - Enhanced with Location Services and Complete Booking System

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db"); // Your db.js connection file
require("dotenv").config();
