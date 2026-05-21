-- ============================================================
--  SoberFolk Ride-Hailing App — PostgreSQL Schema Recreation
--  Run this file top-to-bottom in the query tool of your new DB
-- ============================================================

-- ============================================================
--  STEP 1: ENUM TYPES
-- ============================================================

CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');

CREATE TYPE location_user_type AS ENUM ('consumer', 'driver');

CREATE TYPE request_status AS ENUM ('sent', 'seen', 'accepted', 'declined', 'expired');

CREATE TYPE ride_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

CREATE TYPE user_type_enum AS ENUM ('driver', 'customer');


-- ============================================================
--  STEP 2: SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS consumers_id_seq;
CREATE SEQUENCE IF NOT EXISTS drivers_id_seq;
CREATE SEQUENCE IF NOT EXISTS consumer_locations_id_seq;
CREATE SEQUENCE IF NOT EXISTS driver_locations_id_seq;
CREATE SEQUENCE IF NOT EXISTS rides_id_seq;
CREATE SEQUENCE IF NOT EXISTS ride_requests_id_seq;
CREATE SEQUENCE IF NOT EXISTS fare_rules_id_seq;
CREATE SEQUENCE IF NOT EXISTS feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS location_history_id_seq;
CREATE SEQUENCE IF NOT EXISTS ride_otp_verifications_id_seq;
CREATE SEQUENCE IF NOT EXISTS ride_messages_id_seq;


-- ============================================================
--  STEP 3: TABLES (independent tables first)
-- ============================================================

-- ---- consumers ----
CREATE TABLE consumers (
    id          integer         NOT NULL DEFAULT nextval('consumers_id_seq'::regclass),
    full_name   varchar(255)    NOT NULL,
    email       varchar(255)    NOT NULL,
    phone       varchar(20)     NOT NULL,
    password    text            NOT NULL,
    gender      gender_type,
    date_of_birth date,
    address     text,
    aadhar_number varchar(12)   NOT NULL,
    profile_photo text,
    created_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---- drivers ----
CREATE TABLE drivers (
    id              integer         NOT NULL DEFAULT nextval('drivers_id_seq'::regclass),
    full_name       varchar(255)    NOT NULL,
    email           varchar(255)    NOT NULL,
    phone           varchar(20)     NOT NULL,
    password        text            NOT NULL,
    gender          gender_type,
    date_of_birth   date,
    address         text,
    aadhar_number   varchar(12)     NOT NULL,
    license_number  varchar(50)     NOT NULL,
    scooter_model   varchar(100),
    profile_photo   text,
    is_available    boolean         NOT NULL DEFAULT false,
    created_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---- consumer_locations ----
CREATE TABLE consumer_locations (
    id          integer         NOT NULL DEFAULT nextval('consumer_locations_id_seq'::regclass),
    user_id     integer         NOT NULL,
    latitude    numeric(10,8)   NOT NULL,
    longitude   numeric(11,8)   NOT NULL,
    geohash     varchar(20),
    address     text,
    created_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---- driver_locations ----
CREATE TABLE driver_locations (
    id          integer         NOT NULL DEFAULT nextval('driver_locations_id_seq'::regclass),
    user_id     integer         NOT NULL,
    latitude    numeric(10,8)   NOT NULL,
    longitude   numeric(11,8)   NOT NULL,
    geohash     varchar(20),
    address     text,
    created_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---- fare_rules ----
CREATE TABLE fare_rules (
    id                  integer         NOT NULL DEFAULT nextval('fare_rules_id_seq'::regclass),
    base_fare           numeric(10,2)   NOT NULL DEFAULT 0,
    per_km_rate         numeric(10,2)   NOT NULL DEFAULT 0,
    min_fare            numeric(10,2)   NOT NULL DEFAULT 0,
    surge_multiplier    numeric(4,2)    NOT NULL DEFAULT 1.00,
    is_active           boolean         NOT NULL DEFAULT true,
    created_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---- location_history ----
CREATE TABLE location_history (
    id          integer         NOT NULL DEFAULT nextval('location_history_id_seq'::regclass),
    user_id     integer         NOT NULL,
    user_type   location_user_type NOT NULL,
    latitude    numeric(10,8)   NOT NULL,
    longitude   numeric(11,8)   NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---- rides ----
CREATE TABLE rides (
    id                  integer         NOT NULL DEFAULT nextval('rides_id_seq'::regclass),
    consumer_id         integer         NOT NULL,
    driver_id           integer,
    pickup_latitude     numeric(10,8)   NOT NULL,
    pickup_longitude    numeric(11,8)   NOT NULL,
    pickup_address      text,
    drop_latitude       numeric(10,8)   NOT NULL,
    drop_longitude      numeric(11,8)   NOT NULL,
    drop_address        text,
    distance_km         numeric(8,2)    NOT NULL,
    fare                numeric(10,2)   NOT NULL,
    status              ride_status     NOT NULL DEFAULT 'pending'::ride_status,
    created_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at         timestamp without time zone,
    started_at          timestamp without time zone,
    completed_at        timestamp without time zone,
    cancelled_at        timestamp without time zone,
    cancellation_reason text,
    rating              smallint,
    feedback            text
);

-- ---- ride_requests ----
CREATE TABLE ride_requests (
    id              integer         NOT NULL DEFAULT nextval('ride_requests_id_seq'::regclass),
    ride_id         integer         NOT NULL,
    driver_id       integer         NOT NULL,
    status          request_status  NOT NULL DEFAULT 'sent'::request_status,
    created_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    responded_at    timestamp without time zone
);

-- ---- feedback ----
CREATE TABLE feedback (
    id                      integer         NOT NULL DEFAULT nextval('feedback_id_seq'::regclass),
    ride_id                 integer         NOT NULL,
    user_id                 integer         NOT NULL,
    user_type               user_type_enum  NOT NULL,
    overall_rating          smallint        NOT NULL,
    cleanliness_rating      smallint        NOT NULL DEFAULT 0,
    safety_rating           smallint        NOT NULL DEFAULT 0,
    communication_rating    smallint        NOT NULL DEFAULT 0,
    punctuality_rating      smallint        NOT NULL DEFAULT 0,
    comments                text,
    tags                    text,
    created_at              timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at              timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---- ride_otp_verifications ----
CREATE TABLE ride_otp_verifications (
    id              integer         NOT NULL DEFAULT nextval('ride_otp_verifications_id_seq'::regclass),
    ride_id         integer         NOT NULL,
    otp_type        varchar(20)     NOT NULL,
    otp_code        varchar(10)     NOT NULL,
    verified        boolean         NOT NULL DEFAULT false,
    attempts        integer         NOT NULL DEFAULT 0,
    locked          boolean         NOT NULL DEFAULT false,
    generated_at    timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at      timestamp without time zone,
    verified_at     timestamp without time zone,
    locked_at       timestamp without time zone,
    last_attempt_at timestamp without time zone
);

-- ---- ride_messages ----
CREATE TABLE ride_messages (
    id                integer         NOT NULL DEFAULT nextval('ride_messages_id_seq'::regclass),
    ride_id           integer         NOT NULL,
    sender_id         integer         NOT NULL,
    sender_role       varchar(20)     NOT NULL CHECK (sender_role IN ('Consumer', 'Driver')),
    message_type      varchar(20)     NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
    body              text            NOT NULL CHECK (length(btrim(body)) > 0),
    client_message_id varchar(100),
    created_at        timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delivered_at      timestamp without time zone,
    read_at           timestamp without time zone
);


-- ============================================================
--  STEP 4: PRIMARY KEYS
-- ============================================================

ALTER TABLE consumers              ADD CONSTRAINT consumers_pkey              PRIMARY KEY (id);
ALTER TABLE drivers                ADD CONSTRAINT drivers_pkey                PRIMARY KEY (id);
ALTER TABLE consumer_locations     ADD CONSTRAINT consumer_locations_pkey     PRIMARY KEY (id);
ALTER TABLE driver_locations       ADD CONSTRAINT driver_locations_pkey       PRIMARY KEY (id);
ALTER TABLE fare_rules             ADD CONSTRAINT fare_rules_pkey             PRIMARY KEY (id);
ALTER TABLE feedback               ADD CONSTRAINT feedback_pkey               PRIMARY KEY (id);
ALTER TABLE location_history       ADD CONSTRAINT location_history_pkey       PRIMARY KEY (id);
ALTER TABLE ride_messages          ADD CONSTRAINT ride_messages_pkey          PRIMARY KEY (id);
ALTER TABLE ride_otp_verifications ADD CONSTRAINT ride_otp_verifications_pkey PRIMARY KEY (id);
ALTER TABLE ride_requests          ADD CONSTRAINT ride_requests_pkey          PRIMARY KEY (id);
ALTER TABLE rides                  ADD CONSTRAINT rides_pkey                  PRIMARY KEY (id);


-- ============================================================
--  STEP 5: UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE consumers              ADD CONSTRAINT consumers_email_key         UNIQUE (email);
ALTER TABLE consumers              ADD CONSTRAINT consumers_aadhar_number_key UNIQUE (aadhar_number);
ALTER TABLE drivers                ADD CONSTRAINT drivers_email_key           UNIQUE (email);
ALTER TABLE drivers                ADD CONSTRAINT drivers_aadhar_number_key   UNIQUE (aadhar_number);
ALTER TABLE ride_otp_verifications ADD CONSTRAINT unique_ride_otp_type        UNIQUE (ride_id, otp_type);
ALTER TABLE ride_messages          ADD CONSTRAINT ride_messages_ride_sender_client_uniq UNIQUE (ride_id, sender_id, client_message_id);


-- ============================================================
--  STEP 6: FOREIGN KEYS
-- ============================================================

ALTER TABLE consumer_locations ADD CONSTRAINT consumer_locations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES consumers(id) ON DELETE CASCADE;

ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES drivers(id) ON DELETE CASCADE;

ALTER TABLE feedback ADD CONSTRAINT feedback_ride_id_fkey
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

ALTER TABLE ride_messages ADD CONSTRAINT ride_messages_ride_id_fkey
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

ALTER TABLE ride_otp_verifications ADD CONSTRAINT ride_otp_verifications_ride_id_fkey
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

ALTER TABLE ride_requests ADD CONSTRAINT ride_requests_driver_id_fkey
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE;

ALTER TABLE ride_requests ADD CONSTRAINT ride_requests_ride_id_fkey
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

ALTER TABLE rides ADD CONSTRAINT rides_consumer_id_fkey
    FOREIGN KEY (consumer_id) REFERENCES consumers(id) ON DELETE CASCADE;

ALTER TABLE rides ADD CONSTRAINT rides_driver_id_fkey
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;


-- ============================================================
--  STEP 7: INDEXES
-- ============================================================

-- consumer_locations
CREATE INDEX idx_consumer_locations_user    ON public.consumer_locations USING btree (user_id);
CREATE INDEX idx_consumer_locations_lat     ON public.consumer_locations USING btree (latitude);
CREATE INDEX idx_consumer_locations_updated ON public.consumer_locations USING btree (updated_at);

-- driver_locations
CREATE INDEX idx_driver_locations_user    ON public.driver_locations USING btree (user_id);
CREATE INDEX idx_driver_locations_lat     ON public.driver_locations USING btree (latitude);
CREATE INDEX idx_driver_locations_updated ON public.driver_locations USING btree (updated_at);
CREATE INDEX idx_driver_location_geohash  ON public.driver_locations USING btree (geohash);

-- feedback
CREATE INDEX idx_feedback_ride      ON public.feedback USING btree (ride_id);
CREATE INDEX idx_feedback_user      ON public.feedback USING btree (user_id);
CREATE INDEX idx_feedback_user_type ON public.feedback USING btree (user_type);

-- location_history
CREATE INDEX idx_location_history_user ON public.location_history USING btree (user_id);
CREATE INDEX idx_location_history_lat  ON public.location_history USING btree (latitude);
CREATE INDEX idx_location_history_time ON public.location_history USING btree (recorded_at);

-- ride_messages
CREATE INDEX idx_ride_messages_ride_time ON public.ride_messages USING btree (ride_id, created_at DESC);
CREATE INDEX idx_ride_messages_sender    ON public.ride_messages USING btree (sender_id, sender_role);

-- ride_otp_verifications
CREATE INDEX idx_otp_ride_id        ON public.ride_otp_verifications USING btree (ride_id);
CREATE INDEX idx_otp_type           ON public.ride_otp_verifications USING btree (otp_type);
CREATE INDEX idx_otp_verified       ON public.ride_otp_verifications USING btree (verified);
CREATE INDEX idx_otp_expires        ON public.ride_otp_verifications USING btree (expires_at);
CREATE INDEX idx_otp_locked         ON public.ride_otp_verifications USING btree (locked);
CREATE INDEX idx_otp_ride_type_verified ON public.ride_otp_verifications USING btree (ride_id, otp_type, verified);

-- ride_requests
CREATE INDEX idx_ride_requests_ride   ON public.ride_requests USING btree (ride_id);
CREATE INDEX idx_ride_requests_driver ON public.ride_requests USING btree (driver_id);

-- rides
CREATE INDEX idx_rides_consumer ON public.rides USING btree (consumer_id);
CREATE INDEX idx_rides_driver   ON public.rides USING btree (driver_id);
CREATE INDEX idx_rides_status   ON public.rides USING btree (status);
CREATE INDEX idx_rides_created  ON public.rides USING btree (created_at);


-- ============================================================
--  STEP 8: SEQUENCE OWNERSHIP (links sequences to their columns)
-- ============================================================

ALTER SEQUENCE consumers_id_seq              OWNED BY consumers.id;
ALTER SEQUENCE drivers_id_seq                OWNED BY drivers.id;
ALTER SEQUENCE consumer_locations_id_seq     OWNED BY consumer_locations.id;
ALTER SEQUENCE driver_locations_id_seq       OWNED BY driver_locations.id;
ALTER SEQUENCE rides_id_seq                  OWNED BY rides.id;
ALTER SEQUENCE ride_requests_id_seq          OWNED BY ride_requests.id;
ALTER SEQUENCE fare_rules_id_seq             OWNED BY fare_rules.id;
ALTER SEQUENCE feedback_id_seq               OWNED BY feedback.id;
ALTER SEQUENCE location_history_id_seq       OWNED BY location_history.id;
ALTER SEQUENCE ride_otp_verifications_id_seq OWNED BY ride_otp_verifications.id;
ALTER SEQUENCE ride_messages_id_seq          OWNED BY ride_messages.id;


-- ============================================================
--  Done! Schema is fully recreated.
-- ============================================================
