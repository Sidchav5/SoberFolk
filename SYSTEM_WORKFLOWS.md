# SoberFolk System Workflows

This document explains how the current codebase handles live locations, WhatsApp tracking, WebSockets, and booking a ride for someone else.

## 1. Live Locations

Live location has two layers in this app:

- The driver app uploads GPS coordinates to the backend.
- The backend stores the latest location and broadcasts it to the active ride room.

### Driver Location Upload

The driver screen starts location tracking when the driver has an active ride. It uses `Geolocation.watchPosition()` and also runs a periodic upload every `LOCATION_UPLOAD_INTERVAL_MS` milliseconds.

Main frontend file:

- `src/components/DriverScreen.tsx`

Main function:

- `startLocationTracking()`
- `uploadDriverLocation()`

The app sends:

```http
POST /api/location/update
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "latitude": 19.076,
  "longitude": 72.8777
}
```

### Backend Location Update

Backend route:

- `src/soberFolks-backend-main/routes/locationRoutes.js`

Backend controller:

- `src/soberFolks-backend-main/controllers/locationController.js`

When `/api/location/update` is called:

1. Backend validates latitude and longitude.
2. If address is missing, backend tries reverse geocoding.
3. Backend writes location to `driver_locations` or `consumer_locations`.
4. Location is stored with geohash using `updateLocationWithGeohash()`.
5. If the user is a driver with an active ride, backend emits a realtime event:

```txt
ride:driver-location
```

Payload shape:

```json
{
  "rideId": 123,
  "driverId": 10,
  "consumerId": 22,
  "status": "accepted",
  "location": {
    "latitude": 19.076,
    "longitude": 72.8777,
    "address": "Resolved address"
  },
  "timestamp": "2026-05-20T..."
}
```

### Consumer Receives Driver Location

Consumer frontend listens for:

```txt
ride:driver-location
```

Main file:

- `src/components/ConsumerHome.tsx`

When received, it updates:

```ts
activeRide.driver.location
```

That location is then shown on the map as the driver marker.

### Important Notes

- Driver location is stored in the backend database.
- Consumer map location updates are pushed through WebSockets when available.
- The public WhatsApp tracking page does not use WebSockets. It polls the backend every 5 seconds.

## 2. WhatsApp Location

WhatsApp integration is used for safety contacts. The backend sends messages through Twilio WhatsApp.

Main files:

- `src/soberFolks-backend-main/utils/whatsapp.js`
- `src/soberFolks-backend-main/utils/safetyContacts.js`
- `src/soberFolks-backend-main/utils/liveTrack.js`
- `src/soberFolks-backend-main/controllers/safetyController.js`
- `src/soberFolks-backend-main/controllers/rideController.js`

### Safety Contacts

During booking, the customer can enter safety contacts.

Frontend sends them in ride request:

```json
{
  "safetyContacts": [
    {
      "name": "Friend",
      "phone": "9876543210"
    }
  ]
}
```

Backend saves them in:

```txt
ride_safety_contacts
```

This table is created automatically by `ensureSafetyContactsTable()` if missing.

### WhatsApp On Ride Accepted

When the driver accepts a ride, backend calls:

```js
sendRideAcceptedNotification()
```

This sends safety contacts:

- consumer name
- driver name
- driver phone
- vehicle/scooter info
- pickup
- drop
- fare
- ETA to pickup

This is non-blocking. If WhatsApp fails, the ride still continues.

### WhatsApp Live Tracking Link

When the ride starts, backend calls:

```js
generateTrackToken()
sendLiveTrackNotification()
```

The generated link looks like:

```txt
https://soberfolks-backend.onrender.com/live-track/<token>
```

The token is stored in:

```txt
live_track_tokens
```

Token TTL:

```txt
6 hours
```

### Public Tracking Page

The WhatsApp receiver opens:

```http
GET /live-track/:token
```

This serves an HTML page with Google Maps. No login is required because the token acts as temporary access.

The page fetches driver location every 5 seconds from:

```http
GET /api/live-track/:token/location
```

That endpoint:

1. validates token
2. checks ride status
3. reads latest driver coordinates from `driver_locations`
4. returns pickup/drop/driver location JSON

If the token is invalid or expired, the page shows expired state. If ride is completed or cancelled, it shows ride ended/completed state.

### Twilio Requirements

WhatsApp sending requires these backend environment variables:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
BACKEND_URL=
```

If Twilio credentials are missing, the code logs the failure and skips sending. It does not break booking.

## 3. WebSockets

Realtime communication uses Socket.IO.

Frontend:

- `src/services/realtime.ts`

Backend:

- `src/soberFolks-backend-main/realtime/socketServer.js`
- initialized from `src/soberFolks-backend-main/server.js`

### Connection

Frontend connects to:

```ts
https://soberfolks-backend.onrender.com
```

with:

```ts
transports: ["websocket", "polling"]
auth: { token }
extraHeaders: { Authorization: `Bearer ${token}` }
```

Backend verifies the JWT during socket connection. If token is missing or invalid, connection is rejected.

### Ride Rooms

Both consumer and driver join ride-specific rooms:

```txt
ride_<rideId>
```

Frontend emits:

```txt
ride:join
```

Payload:

```json
{
  "rideId": 123
}
```

Backend checks whether the socket user is allowed to access that ride:

```sql
SELECT id FROM rides
WHERE id = $1 AND (consumer_id = $2 OR driver_id = $2)
```

Only the ride consumer or assigned driver can join the room.

### Main Socket Events

#### `ride:stage-changed`

Emitted when ride changes stage:

- accepted
- in_progress
- completed
- cancelled

Backend helper:

```js
emitRideStageChanged(rideId, payload)
```

Used in:

- driver accepts ride
- ride starts
- ride completes
- ride is cancelled
- OTP flow changes ride state

Consumer uses this to:

- stop search polling when accepted
- fetch active ride
- show payment when completed

Driver uses this to:

- refresh active ride
- move to status tab
- refresh history when completed/cancelled

#### `ride:driver-location`

Emitted when driver uploads location during accepted/in-progress ride.

Backend helper:

```js
emitDriverLocationUpdated(rideId, payload)
```

Consumer uses this to update the driver marker on the map.

#### `chat:send`

Frontend emits this to send ride chat messages.

Backend:

1. validates ride access
2. persists message
3. emits `chat:message` to room

#### `chat:message`

Received by both consumer and driver for ride chat.

#### `chat:typing`

Emitted to show typing status to the other participant in the ride room.

### WebSockets vs Polling

The app still uses polling in some places as fallback:

- ride search status
- active ride refresh
- public WhatsApp live tracking page

WebSockets are used for realtime app-to-app updates. Public tracking uses HTTP polling.

## 4. Ride Booking For Someone Else

This feature lets one consumer book a ride for another registered consumer.

Main frontend file:

- `src/components/ConsumerHome.tsx`

Main backend file:

- `src/soberFolks-backend-main/controllers/rideController.js`

### Frontend Flow

Customer enables:

```txt
Book for someone else
```

The app stores:

```ts
isBookingForSomeoneElse
passengerPhoneInput
verifiedPassengerName
passengerId
```

Before booking, passenger must be verified. The backend expects a valid `passengerId`.

During booking, frontend sends:

```json
{
  "pickupLocation": {},
  "dropLocation": {},
  "pickupAddress": "...",
  "dropAddress": "...",
  "driverQueue": [],
  "safetyContacts": [],
  "passengerId": 22,
  "bookerInfo": {
    "name": "Booker",
    "phone": "9999999999"
  }
}
```

If booking for someone else, the app automatically adds the booker as a safety contact so they can receive WhatsApp updates.

### Backend Ride Creation

Backend route:

```http
POST /api/rides/request
```

In `requestRide()`:

```js
const parsedPassengerId = passengerId ? parseInt(passengerId, 10) : null;
const actualConsumerId = parsedPassengerId || req.user.id;
const bookedById = parsedPassengerId ? req.user.id : null;
```

This means:

- `consumer_id` becomes the passenger.
- `booked_by_id` becomes the logged-in booker.

The ride row stores both:

```sql
consumer_id
booked_by_id
```

If `passengerId` is invalid or passenger does not exist, backend rejects the request.

### Who Sees The Ride?

The active ride query for consumers is based on:

```sql
WHERE r.consumer_id = $1
```

So the passenger sees the active ride in their own SoberFolk app.

The backend also includes booker details when available:

```json
{
  "bookedBy": {
    "id": 11,
    "name": "Booker Name",
    "phone": "9999999999"
  }
}
```

### Driver View

Driver receives the ride like a normal ride. The ride's `consumer` is the passenger, not the booker.

Driver OTP, pickup, drop, and completion flow stay the same.

### WhatsApp For Booker

Because the frontend adds the booker as a safety contact, the booker receives:

- ride accepted WhatsApp message
- live tracking WhatsApp link after ride starts

This is how the person who booked can monitor the ride even though they are not the ride passenger.

### Payment Responsibility

Current code ties payment to the ride consumer because payment endpoints authorize by:

```txt
payment.consumer_id === logged-in consumer id
```

So for booked-for-someone rides, the passenger account is the ride consumer. If the booker should pay instead, the payment ownership logic would need to be changed to allow `booked_by_id` payment.

## 5. Driver Rating Consumer

There is existing code for a driver to rate a customer/passenger, but it is only partially connected.

### Existing Driver Feedback Screen

Frontend screen:

```txt
src/components/DriverFeedback.tsx
```

Route registration:

```txt
App.tsx
```

The route is registered as:

```tsx
<Stack.Screen name="DriverFeedback" component={DriverFeedbackRoute} />
```

The screen title and labels confirm that it is meant for driver-to-customer rating:

```txt
Rate Your Customer
Rate Customer
Rate Customer Behavior
```

The screen collects:

- overall rating
- communication rating
- punctuality rating
- positive/negative tags
- comments

On submit it calls:

```http
POST /api/feedback/submit
```

with:

```json
{
  "rideId": 123,
  "userType": "driver",
  "overallRating": 5,
  "communicationRating": 5,
  "punctualityRating": 5,
  "comments": "Good customer",
  "tags": ["Polite and respectful"]
}
```

### Backend Save Logic

Backend controller:

```txt
src/soberFolks-backend-main/controllers/feedbackController.js
```

Backend route:

```txt
src/soberFolks-backend-main/routes/feedbackRoutes.js
```

The backend accepts:

```txt
userType = "driver" | "customer"
```

When `userType` is `driver`, backend verifies that the logged-in user is the ride driver:

```js
if (ride.driver_id !== callerId) {
  return res.status(403).json({ success: false, error: "Not your ride" });
}
```

Then it inserts a row in:

```txt
feedback
```

with:

```txt
ride_id
user_id
user_type
overall_rating
cleanliness_rating
safety_rating
communication_rating
punctuality_rating
comments
tags
```

### Current Gap

The consumer rating screen is wired from completed rides in:

```txt
src/components/ConsumerHome.tsx
```

The driver rating screen exists, but `DriverScreen.tsx` currently completes the ride and refreshes state without navigating to:

```txt
DriverFeedback
```

So the feature exists in code, but the driver flow does not currently expose it naturally after ride completion.

### Another Gap

There is an aggregate rating endpoint for driver ratings:

```http
GET /api/feedback/driver/:driverId/summary
```

But there is no matching consumer summary endpoint like:

```http
GET /api/feedback/consumer/:consumerId/summary
```

So driver-submitted feedback can be saved, but the app does not currently expose an aggregate consumer rating summary.

## Quick Reference

| Feature | App/Client | Backend | Storage | Realtime |
|---|---|---|---|---|
| Driver live location | `DriverScreen.tsx` | `locationController.js` | `driver_locations` | `ride:driver-location` |
| Consumer map update | `ConsumerHome.tsx` | `socketServer.js` | reads active ride state | receives `ride:driver-location` |
| WhatsApp accepted alert | booking safety modal | `rideController.js`, `whatsapp.js` | `ride_safety_contacts` | no |
| WhatsApp live link | public browser page | `safetyController.js`, `liveTrack.js` | `live_track_tokens`, `driver_locations` | no, HTTP polling |
| App WebSockets | `realtime.ts` | `socketServer.js` | JWT + ride DB access check | yes |
| Book for someone else | `ConsumerHome.tsx` | `rideController.js` | `rides.consumer_id`, `rides.booked_by_id` | normal ride room |
| Driver rates consumer | `DriverFeedback.tsx` | `feedbackController.js` | `feedback.user_type = driver` | no |
