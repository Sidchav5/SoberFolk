-- SoberFolks Database Schema for PostgreSQL
-- Run this script on your Render PostgreSQL database

-- =========================
-- ENUM TYPES
-- =========================
CREATE TYPE gender_type AS ENUM ('Male','Female','Other');
CREATE TYPE ride_status AS ENUM ('pending','accepted','in_progress','completed','cancelled');
CREATE TYPE request_status AS ENUM ('sent','seen','accepted','declined','expired');
CREATE TYPE user_type_enum AS ENUM ('driver','customer');
CREATE TYPE location_user_type AS ENUM ('consumer','driver');

-- =========================
-- CONSUMERS
-- =========================
CREATE TABLE consumers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    gender gender_type NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    aadhar_number CHAR(12) NOT NULL UNIQUE,
    profile_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- DRIVERS
-- =========================
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    gender gender_type NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    aadhar_number CHAR(12) NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL,
    scooter_model VARCHAR(50) NOT NULL,
    profile_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_available BOOLEAN DEFAULT FALSE
);

-- =========================
-- CONSUMER LOCATIONS
-- =========================
CREATE TABLE consumer_locations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geohash VARCHAR(12)
);

-- =========================
-- DRIVER LOCATIONS
-- =========================
CREATE TABLE driver_locations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geohash VARCHAR(12)
);

-- =========================
-- RIDES
-- =========================
CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    consumer_id INT NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
    driver_id INT REFERENCES drivers(id) ON DELETE SET NULL,
    pickup_latitude DECIMAL(10,8) NOT NULL,
    pickup_longitude DECIMAL(11,8) NOT NULL,
    pickup_address TEXT,
    drop_latitude DECIMAL(10,8) NOT NULL,
    drop_longitude DECIMAL(11,8) NOT NULL,
    drop_address TEXT,
    distance_km DECIMAL(8,2) NOT NULL,
    fare DECIMAL(10,2) NOT NULL,
    status ride_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT
);

-- =========================
-- RIDE REQUESTS
-- =========================
CREATE TABLE ride_requests (
    id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    driver_id INT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    status request_status DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- =========================
-- FARE RULES
-- =========================
CREATE TABLE fare_rules (
    id SERIAL PRIMARY KEY,
    base_fare DECIMAL(8,2) DEFAULT 50.00,
    per_km_rate DECIMAL(8,2) DEFAULT 15.00,
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    min_fare DECIMAL(8,2) DEFAULT 50.00,
    max_fare DECIMAL(8,2) DEFAULT 1000.00,
    city VARCHAR(100) DEFAULT 'default',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- FEEDBACK
-- =========================
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    user_type user_type_enum NOT NULL,
    overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
    cleanliness_rating SMALLINT DEFAULT 0,
    safety_rating SMALLINT DEFAULT 0,
    communication_rating SMALLINT DEFAULT 0,
    punctuality_rating SMALLINT DEFAULT 0,
    comments TEXT,
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- LOCATION HISTORY
-- =========================
CREATE TABLE location_history (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    user_type location_user_type NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address TEXT,
    speed DECIMAL(5,2) DEFAULT 0.00,
    heading DECIMAL(5,2) DEFAULT 0.00,
    accuracy DECIMAL(8,2) DEFAULT 0.00,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_consumer_locations_user ON consumer_locations(user_id);
CREATE INDEX idx_consumer_locations_lat ON consumer_locations(latitude);
CREATE INDEX idx_consumer_locations_updated ON consumer_locations(updated_at);

CREATE INDEX idx_driver_locations_user ON driver_locations(user_id);
CREATE INDEX idx_driver_locations_lat ON driver_locations(latitude);
CREATE INDEX idx_driver_locations_updated ON driver_locations(updated_at);
CREATE INDEX idx_driver_location_geohash ON driver_locations(geohash);

CREATE INDEX idx_rides_consumer ON rides(consumer_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created ON rides(created_at);

CREATE INDEX idx_ride_requests_ride ON ride_requests(ride_id);
CREATE INDEX idx_ride_requests_driver ON ride_requests(driver_id);

CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_user_type ON feedback(user_type);
CREATE INDEX idx_feedback_ride ON feedback(ride_id);

CREATE INDEX idx_location_history_user ON location_history(user_id);
CREATE INDEX idx_location_history_lat ON location_history(latitude);
CREATE INDEX idx_location_history_time ON location_history(recorded_at);

-- =========================
-- AUTO UPDATE TRIGGER
-- =========================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consumer_loc_update
BEFORE UPDATE ON consumer_locations
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_driver_loc_update
BEFORE UPDATE ON driver_locations
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_fare_update
BEFORE UPDATE ON fare_rules
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_feedback_update
BEFORE UPDATE ON feedback
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =========================
-- VIEWS
-- =========================
CREATE VIEW consumer_rides_view AS
SELECT 
    r.id,
    r.consumer_id,
    r.pickup_address,
    r.drop_address,
    r.distance_km,
    r.fare,
    r.status,
    r.created_at,
    r.completed_at,
    d.full_name AS driver_name,
    d.phone AS driver_phone,
    d.scooter_model,
    r.rating,
    r.feedback
FROM rides r
LEFT JOIN drivers d ON r.driver_id = d.id;

CREATE VIEW driver_dashboard_view AS
SELECT 
    d.id,
    d.full_name,
    d.email,
    d.phone,
    d.scooter_model,
    d.is_available,
    dl.latitude AS current_latitude,
    dl.longitude AS current_longitude,
    dl.address AS current_address,
    dl.updated_at AS location_updated_at,
    COUNT(r.id) FILTER (WHERE r.status='completed') AS total_rides,
    COALESCE(SUM(r.fare) FILTER (WHERE r.status='completed'),0) AS total_earnings,
    COALESCE(AVG(r.rating) FILTER (WHERE r.status='completed'),0) AS average_rating
FROM drivers d
LEFT JOIN driver_locations dl ON d.id = dl.user_id
LEFT JOIN rides r ON d.id = r.driver_id
GROUP BY d.id, dl.latitude, dl.longitude, dl.address, dl.updated_at;
