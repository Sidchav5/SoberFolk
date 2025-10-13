import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Platform,
  PermissionsAndroid,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import MapView, { Marker, Polyline } from "react-native-maps";
import LinearGradient from "react-native-linear-gradient";
import Geolocation from '@react-native-community/geolocation';

const { width } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: 19.0760,
  longitude: 72.8777,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Try multiple IPs for local network flexibility
const API_URLS = [
  "http://192.168.1.2:5000",    // New IP
  "http://10.139.99.126:5000",  // Original IP
];

const API_BASE_URL = API_URLS[1];  // Change index to 0 or 1 to switch
// Helper function to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
const ConsumerHome: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<"BookRide" | "RecentRides" | "MyDetails">("BookRide");
  const [user, setUser] = useState<any>(null);
  const [currentRegion, setCurrentRegion] = useState(DEFAULT_REGION);
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  
  // Route visualization states
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [pickupCoords, setPickupCoords] = useState<any>(null);
  const [dropCoords, setDropCoords] = useState<any>(null);
  const [isRouteFetching, setIsRouteFetching] = useState(false);
  
  // Autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<any[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropSuggestions, setShowDropSuggestions] = useState(false);
  const [isLoadingPickupSuggestions, setIsLoadingPickupSuggestions] = useState(false);
  const [isLoadingDropSuggestions, setIsLoadingDropSuggestions] = useState(false);

  // Booking system states
  const [isBooking, setIsBooking] = useState(false);
  const [driverQueue, setDriverQueue] = useState<any[]>([]);
  const [currentRideRequest, setCurrentRideRequest] = useState<any>(null);
  const [bookingStatus, setBookingStatus] = useState<string>('');
  const [statusPollingInterval, setStatusPollingInterval] = useState<any>(null);
    // Active ride state
    const [activeRide, setActiveRide] = useState<any>(null);
    const [isLoadingActiveRide, setIsLoadingActiveRide] = useState(false);
  const [recentRides, setRecentRides] = useState<any[]>([
    {
      id: 1,
      pickup: "MG Road, Bangalore",
      drop: "Koramangala 5th Block",
      fare: 185,
      date: "2025-01-15",
      time: "14:30",
      status: "Completed",
    },
    {
      id: 2,
      pickup: "Indiranagar Metro Station",
      drop: "HSR Layout",
      fare: 220,
      date: "2025-01-14",
      time: "09:15",
      status: "Completed",
    },
  ]);
  
  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "ios") {
      try {
        setLocationPermissionGranted(true);
        return true;
      } catch (e) {
        setLocationPermissionGranted(false);
        return false;
      }
    }

    try {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      
      const fine = result["android.permission.ACCESS_FINE_LOCATION"];
      const coarse = result["android.permission.ACCESS_COARSE_LOCATION"];
      
      const granted = fine === PermissionsAndroid.RESULTS.GRANTED || coarse === PermissionsAndroid.RESULTS.GRANTED;
      setLocationPermissionGranted(granted);
      return granted;
    } catch (err) {
      setLocationPermissionGranted(false);
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsLocationLoading(true);
    
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      Alert.alert(
        "Location Permission Required",
        "This app needs location access to show your current position.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => {} }
        ]
      );
      setCurrentRegion(DEFAULT_REGION);
      setIsLocationLoading(false);
      return;
    }

    const tryGetLocation = (useHighAccuracy: boolean, timeoutMs: number) => {
      return new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          { 
            enableHighAccuracy: useHighAccuracy,
            timeout: timeoutMs,
            maximumAge: 60000
          }
        );
      });
    };

    try {
      let position;
      
      try {
        position = await tryGetLocation(false, 10000);
      } catch (networkError) {
        position = await tryGetLocation(true, 20000);
      }
      
      if (position?.coords?.latitude && position?.coords?.longitude) {
        const newRegion = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setCurrentRegion(newRegion);
      } else {
        setCurrentRegion(DEFAULT_REGION);
      }
      setIsLocationLoading(false);
    } catch (error: any) {
      let errorMessage = "Could not fetch current location. ";
      
      switch (error.code) {
        case 1:
          errorMessage += "Location access denied.";
          break;
        case 2:
          errorMessage += "Location unavailable.";
          break;
        case 3:
          errorMessage += "Location request timed out.";
          break;
        default:
          errorMessage += "Unknown error occurred.";
      }
      
      Alert.alert("Location Error", errorMessage);
      setCurrentRegion(DEFAULT_REGION);
      setIsLocationLoading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("currentUser");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        }
      } catch (e) {
        console.error("Failed to fetch user:", e);
      }
    };
    
    fetchUser();
    fetchActiveRide();
    const locationTimer = setTimeout(() => {
      getCurrentLocation();
    }, 500);
    
    return () => {
      clearTimeout(locationTimer);
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
    };
  }, []);
  
  // Fetch autocomplete suggestions
  const fetchPlaceSuggestions = async (input: string, isPickup: boolean) => {
    if (!input.trim() || input.length < 3) {
      if (isPickup) {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropSuggestions([]);
        setShowDropSuggestions(false);
      }
      return;
    }

    if (isPickup) {
      setIsLoadingPickupSuggestions(true);
    } else {
      setIsLoadingDropSuggestions(true);
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/places/autocomplete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: input.trim(),
          location: {
            latitude: currentRegion.latitude,
            longitude: currentRegion.longitude,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (isPickup) {
          setPickupSuggestions(data.suggestions);
          setShowPickupSuggestions(true);
        } else {
          setDropSuggestions(data.suggestions);
          setShowDropSuggestions(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      if (isPickup) {
        setIsLoadingPickupSuggestions(false);
      } else {
        setIsLoadingDropSuggestions(false);
      }
    }
  };

  // Handle place selection
  const handlePlaceSelect = async (placeId: string, description: string, isPickup: boolean) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/places/details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ place_id: placeId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (isPickup) {
          setPickup(description);
          setPickupCoords(data.coordinates);
          setShowPickupSuggestions(false);
          setPickupSuggestions([]);
        } else {
          setDrop(description);
          setDropCoords(data.coordinates);
          setShowDropSuggestions(false);
          setDropSuggestions([]);
        }

        // If both locations are set, fetch route
        if (isPickup && dropCoords) {
          fetchRoute(description, drop);
        } else if (!isPickup && pickupCoords) {
          fetchRoute(pickup, description);
        }
      }
    } catch (error) {
      console.error("Failed to get place details:", error);
      Alert.alert("Error", "Failed to get location details. Please try again.");
    }
  };

  const refreshLocation = () => {
    if (!isLocationLoading) {
      getCurrentLocation();
    }
  };

  // Fetch route between pickup and drop locations
  const fetchRoute = async (pickupAddress: string, dropAddress: string) => {
    if (!pickupCoords || !dropCoords) {
      setRouteCoordinates([]);
      setRouteInfo(null);
      return;
    }

    setIsRouteFetching(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/directions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin: pickupAddress,
          destination: dropAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRouteCoordinates(data.route.coordinates);
        setRouteInfo({
          distance: data.route.distance,
          duration: data.route.duration,
        });
        
        // Zoom map to show entire route
        const allCoords = [
          data.route.startLocation,
          ...data.route.coordinates,
          data.route.endLocation
        ];
        
        if (allCoords.length > 0) {
          const latitudes = allCoords.map(coord => coord.latitude || coord.lat);
          const longitudes = allCoords.map(coord => coord.longitude || coord.lng);
          
          const minLat = Math.min(...latitudes);
          const maxLat = Math.max(...latitudes);
          const minLng = Math.min(...longitudes);
          const maxLng = Math.max(...longitudes);
          
          setCurrentRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: (maxLat - minLat) * 1.5,
            longitudeDelta: (maxLng - minLng) * 1.5,
          });
        }
      } else {
        console.error("Route error:", data.error);
        Alert.alert("Route Error", "Could not find a route between these locations.");
        setRouteCoordinates([]);
        setRouteInfo(null);
      }
    } catch (error) {
      console.error("Route fetch error:", error);
      Alert.alert("Error", "Failed to fetch route. Please check your connection.");
      setRouteCoordinates([]);
      setRouteInfo(null);
    } finally {
      setIsRouteFetching(false);
    }
  };

  // Coordinate-based route triggering
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickupCoords && dropCoords) {
        fetchRoute(pickup, drop);
      } else {
        setRouteCoordinates([]);
        setRouteInfo(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pickupCoords, dropCoords]);

  // Debounced autocomplete for pickup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickup.trim()) {
        fetchPlaceSuggestions(pickup, true);
      } else {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pickup]);

  // Debounced autocomplete for drop
  useEffect(() => {
    const timer = setTimeout(() => {
      if (drop.trim()) {
        fetchPlaceSuggestions(drop, false);
      } else {
        setDropSuggestions([]);
        setShowDropSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [drop]);

  // Find nearby drivers
  const findNearbyDrivers = async () => {
    if (!pickupCoords) {
      Alert.alert("Error", "Please select a pickup location first");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/rides/find-drivers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupLocation: pickupCoords
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.drivers;
      } else {
        throw new Error(data.error || "Failed to find drivers");
      }
    } catch (error) {
      console.error("Find drivers error:", error);
      throw error;
    }
  };
    // Fetch active ride for consumer
    const fetchActiveRide = async () => {
      setIsLoadingActiveRide(true);
      try {
        const token = await AsyncStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/rides/active`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json();
  
        if (response.ok && data.success && data.ride) {
          setActiveRide(data.ride);
          
          // Set map markers for active ride
          setPickupCoords({
            latitude: data.ride.pickup.latitude,
            longitude: data.ride.pickup.longitude,
          });
          setDropCoords({
            latitude: data.ride.drop.latitude,
            longitude: data.ride.drop.longitude,
          });
          
          // Set addresses
          setPickup(data.ride.pickup.address);
          setDrop(data.ride.drop.address);
          
          // Fetch route
          fetchRoute(data.ride.pickup.address, data.ride.drop.address);
        } else {
          setActiveRide(null);
        }
      } catch (error) {
        console.error("Failed to fetch active ride:", error);
        setActiveRide(null);
      } finally {
        setIsLoadingActiveRide(false);
      }
    };
    // Poll active ride status every 10 seconds
useEffect(() => {
  if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'in_progress')) {
    const pollInterval = setInterval(() => {
      fetchActiveRide();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }
}, [activeRide]);
  // Poll for ride status
  const startRideStatusPolling = async (rideId: number) => {
    const interval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.status === 'accepted') {
            clearInterval(interval);
            setStatusPollingInterval(null);
            setIsBooking(false);
            setBookingStatus('');
            
            Alert.alert(
              "Ride Accepted! 🎉",
              `Your ride has been accepted!\n\nDriver is on the way to your pickup location.`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    // Clear form
                    setPickup("");
                    setDrop("");
                    setPickupCoords(null);
                    setDropCoords(null);
                    setCurrentRideRequest(null);
                    setDriverQueue([]);
                    setRouteCoordinates([]);
                    setRouteInfo(null);
                  }
                }
              ]
            );
          } else if (data.status === 'no_drivers') {
            clearInterval(interval);
            setStatusPollingInterval(null);
            setIsBooking(false);
            setBookingStatus('');
            
            Alert.alert(
              "No Drivers Available",
              "All drivers are currently busy. Please try again later."
            );
            
            setCurrentRideRequest(null);
            setDriverQueue([]);
          } else if (data.currentDriver) {
            setBookingStatus(
              `Waiting for driver ${data.currentDriver.name} (${data.currentDriver.queuePosition}/${data.currentDriver.totalDrivers}) to accept...`
            );
          }
        }
      } catch (error) {
        console.error("Status polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    setStatusPollingInterval(interval);

    // Stop polling after 2 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setStatusPollingInterval(null);
      }
      if (isBooking) {
        setIsBooking(false);
        setBookingStatus('');
        Alert.alert("Timeout", "Ride request timed out. Please try again.");
      }
    }, 120000);
  };

  // Handle book ride with driver queue
  const handleBookRide = async () => {
    if (!pickup.trim() || !drop.trim()) {
      Alert.alert("Missing Information", "Please enter both pickup and drop locations");
      return;
    }

    if (!pickupCoords || !dropCoords) {
      Alert.alert("Invalid Locations", "Please select valid locations from suggestions");
      return;
    }

    if (pickup.trim().toLowerCase() === drop.trim().toLowerCase()) {
      Alert.alert("Invalid Route", "Pickup and drop locations cannot be the same");
      return;
    }

    setIsBooking(true);
    setBookingStatus('Finding nearby drivers...');

    try {
      // Step 1: Find nearby drivers
      const drivers = await findNearbyDrivers();

      if (!drivers || drivers.length === 0) {
        Alert.alert(
          "No Drivers Available",
          "Sorry, no drivers are available in your area right now. Please try again later."
        );
        setIsBooking(false);
        setBookingStatus('');
        return;
      }

      setDriverQueue(drivers);
      setBookingStatus(`Found ${drivers.length} driver(s). Creating ride request...`);

      // Step 2: Create ride request
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/rides/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupLocation: pickupCoords,
          dropLocation: dropCoords,
          pickupAddress: pickup,
          dropAddress: drop,
          driverQueue: drivers
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentRideRequest(data.ride);
        setBookingStatus(`Waiting for driver ${data.ride.currentDriver.fullName} to accept...`);

        // Poll for ride status
        startRideStatusPolling(data.rideId);
      } else {
        throw new Error(data.error || "Failed to create ride request");
      }
    } catch (error: any) {
      Alert.alert("Booking Error", error.message || "Failed to book ride. Please try again.");
      setIsBooking(false);
      setBookingStatus('');
    }
  };

  useEffect(() => {
    const loadSavedRides = async () => {
      try {
        const savedRides = await AsyncStorage.getItem("recentRides");
        if (savedRides) {
          setRecentRides(JSON.parse(savedRides));
        }
      } catch (error) {
        console.error("Error loading saved rides:", error);
      }
    };
    
    loadSavedRides();
  }, []);

  // Handle Android Back Button
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel"
          },
          {
            text: "Logout",
            onPress: async () => {
              await AsyncStorage.removeItem("authToken");
              await AsyncStorage.removeItem("currentUser");
              await AsyncStorage.removeItem("userRole");
              await AsyncStorage.removeItem("recentRides");
              
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            }
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  const renderContent = () => {
    switch (activeTab) {
      case "BookRide":
        return (
          <View style={styles.mapContainer}>
                        {/* Active Ride Banner */}
                        {activeRide && (
              <View style={styles.activeRideBanner}>
                <LinearGradient
                  colors={activeRide.status === 'in_progress' ? ['#00C853', '#00E676'] : ['#6E44FF', '#8A6EFF']}
                  style={styles.activeRideGradient}
                >
                  <View style={styles.activeRideHeader}>
                    <Text style={styles.activeRideTitle}>
                      {activeRide.status === 'accepted' 
                        ? '🚗 Driver is coming!' 
                        : activeRide.status === 'in_progress'
                        ? '🛣️ Trip in progress'
                        : '✅ Ride Completed!'}
                    </Text>
                    <View style={styles.activeRideStatusBadge}>
                      <Text style={styles.activeRideStatusText}>
                        {activeRide.status.toUpperCase().replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* ETA Display */}
                  {activeRide.status === 'accepted' && activeRide.driver?.location && (
                    <View style={styles.etaContainer}>
                      <Text style={styles.etaLabel}>Driver arriving in:</Text>
                      <Text style={styles.etaTime}>
                        {Math.round(
                          (calculateDistance(
                            activeRide.driver.location.latitude,
                            activeRide.driver.location.longitude,
                            activeRide.pickup.latitude,
                            activeRide.pickup.longitude
                          ) / 25) * 60
                        )} min
                      </Text>
                      <Text style={styles.etaSubtext}>
                        ({calculateDistance(
                          activeRide.driver.location.latitude,
                          activeRide.driver.location.longitude,
                          activeRide.pickup.latitude,
                          activeRide.pickup.longitude
                        ).toFixed(1)} km away)
                      </Text>
                    </View>
                  )}

                  {/* Trip Progress */}
                  {activeRide.status === 'in_progress' && (
                    <View style={styles.tripProgressContainer}>
                      <Text style={styles.tripProgressLabel}>🚗 En route to destination</Text>
                      <Text style={styles.tripProgressEta}>
                        Estimated arrival: {Math.round((activeRide.distance / 25) * 60)} min
                      </Text>
                    </View>
                  )}

                  {/* POC Simulation Notice */}
                  <View style={styles.pocNotice}>
                    <Text style={styles.pocNoticeText}>
                      🤖 POC Mode: Ride will auto-complete in 5 minutes
                    </Text>
                  </View>

                  {/* Driver Info */}
                  {activeRide.driver && (
                    <View style={styles.driverInfoCard}>
                      <View style={styles.driverPhotoContainer}>
                        {activeRide.driver.profilePhoto ? (
                          <Image 
                            source={{ uri: activeRide.driver.profilePhoto }} 
                            style={styles.driverPhoto} 
                          />
                        ) : (
                          <Image
                            source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
                            style={styles.driverPhoto}
                          />
                        )}
                      </View>
                      <View style={styles.driverDetails}>
                        <Text style={styles.driverName}>{activeRide.driver.name}</Text>
                        <Text style={styles.driverScooter}>{activeRide.driver.scooterModel}</Text>
                        <Text style={styles.driverPhone}>{activeRide.driver.phone}</Text>
                      </View>
                    </View>
                  )}

                  {/* Trip Details */}
                  <View style={styles.activeTripDetails}>
                    <View style={styles.activeTripRow}>
                      <Text style={styles.activeTripLabel}>Pickup:</Text>
                      <Text style={styles.activeTripValue} numberOfLines={1}>
                        {activeRide.pickup.address}
                      </Text>
                    </View>
                    <View style={styles.activeTripRow}>
                      <Text style={styles.activeTripLabel}>Drop:</Text>
                      <Text style={styles.activeTripValue} numberOfLines={1}>
                        {activeRide.drop.address}
                      </Text>
                    </View>
                    <View style={styles.activeTripRow}>
                      <Text style={styles.activeTripLabel}>Distance:</Text>
                      <Text style={styles.activeTripValue}>{activeRide.distance} km</Text>
                    </View>
                    <View style={styles.activeTripRow}>
                      <Text style={styles.activeTripLabel}>Fare:</Text>
                      <Text style={styles.activeTripFare}>₹{activeRide.fare}</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.activeRideActions}>
                    <TouchableOpacity 
                      style={styles.callDriverButton}
                      onPress={() => {
                        Alert.alert(
                          "Call Driver",
                          `Would you like to call ${activeRide.driver.name}?\n${activeRide.driver.phone}`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Call", onPress: () => console.log("Calling driver...") }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.callDriverText}>📞 Call Driver</Text>
                    </TouchableOpacity>
                    
                    {activeRide.status === 'accepted' && (
                      <TouchableOpacity 
                        style={styles.cancelRideButton}
                        onPress={() => {
                          Alert.alert(
                            "Cancel Ride",
                            "Are you sure you want to cancel this ride?",
                            [
                              { text: "No", style: "cancel" },
                              { 
                                text: "Yes, Cancel", 
                                style: "destructive",
                                onPress: async () => {
                                  setActiveRide(null);
                                  fetchActiveRide();
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.cancelRideText}>Cancel Ride</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              </View>
            )}

            <View style={styles.mapWrapper}>
              <MapView
                style={styles.map}
                initialRegion={DEFAULT_REGION}
                region={currentRegion}
                showsUserLocation={locationPermissionGranted}
                showsMyLocationButton={false}
                loadingEnabled={true}
                loadingIndicatorColor="#6E44FF"
              >
                {/* Current Location Marker */}
                {currentRegion && locationPermissionGranted && !pickupCoords && (
                  <Marker 
                    coordinate={currentRegion} 
                    title="Your Location"
                    pinColor="#6E44FF"
                  />
                )}
                
                {/* Pickup Location Marker */}
                {pickupCoords && (
                  <Marker
                    coordinate={pickupCoords}
                    title="Pickup"
                    description={pickup}
                    pinColor="#00C853"
                  >
                    <View style={styles.customMarker}>
                      <LinearGradient
                        colors={['#00C853', '#00E676']}
                        style={styles.markerGradient}
                      >
                        <Text style={styles.markerText}>P</Text>
                      </LinearGradient>
                    </View>
                  </Marker>
                )}
                
                {/* Drop Location Marker */}
                {dropCoords && (
                  <Marker
                    coordinate={dropCoords}
                    title="Drop"
                    description={drop}
                    pinColor="#FF1744"
                  >
                    <View style={styles.customMarker}>
                      <LinearGradient
                        colors={['#FF1744', '#FF5252']}
                        style={styles.markerGradient}
                      >
                        <Text style={styles.markerText}>D</Text>
                      </LinearGradient>
                    </View>
                  </Marker>
                )}
                
                {/* Route Polyline */}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#6E44FF"
                    strokeWidth={5}
                    lineDashPattern={[0]}
                  />
                )}
              </MapView>

              {/* Route Info Banner */}
              {routeInfo && (
                <View style={styles.routeInfoBanner}>
                  <LinearGradient
                    colors={['#6E44FF', '#8A6EFF']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.routeInfoGradient}
                  >
                    <Text style={styles.routeInfoText}>
                      🚗 {routeInfo.distance} • ⏱️ {routeInfo.duration}
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {/* Location Refresh Button */}
              <View style={styles.mapOverlay}>
                <TouchableOpacity 
                  onPress={refreshLocation}
                  disabled={isLocationLoading}
                  style={[styles.locationButton, isLocationLoading && styles.disabledButton]}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#6E44FF']}
                    style={styles.locationButtonGradient}
                  >
                    <Image
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/684/684908.png" }}
                      style={[styles.mapMarkerIcon, isLocationLoading && { opacity: 0.5 }]}
                    />
                  </LinearGradient>
                  {isLocationLoading && (
                    <ActivityIndicator size="small" color="#6E44FF" style={styles.loadingIndicator} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Route Fetching Indicator */}
              {isRouteFetching && (
                <View style={styles.routeFetchingIndicator}>
                  <ActivityIndicator size="small" color="#6E44FF" />
                  <Text style={styles.routeFetchingText}>Finding route...</Text>
                </View>
              )}
            </View>

            {!activeRide && (
              <View style={styles.locationInputs}>
                {/* Pickup Input */}
                <View style={styles.inputContainer}>
                  <LinearGradient
                    colors={['#FF6B6B', '#6E44FF']}
                    style={styles.inputIconContainer}
                  >
                    <Image
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/684/684908.png" }}
                      style={styles.inputIcon}
                    />
                  </LinearGradient>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter pickup location"
                    placeholderTextColor="#888"
                    value={pickup}
                    onChangeText={(text) => {
                      setPickup(text);
                      if (!text.trim()) {
                        setPickupCoords(null);
                        setShowPickupSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (pickupSuggestions.length > 0) {
                        setShowPickupSuggestions(true);
                      }
                    }}
                  />
                  {isLoadingPickupSuggestions && (
                    <ActivityIndicator size="small" color="#6E44FF" style={{ marginRight: 8 }} />
                  )}
                </View>

                {/* Pickup Suggestions Dropdown */}
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <ScrollView 
                    style={styles.suggestionsContainer}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    {pickupSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={suggestion.place_id || index}
                        style={styles.suggestionItem}
                        onPress={() => handlePlaceSelect(suggestion.place_id, suggestion.description, true)}
                      >
                        <View style={styles.suggestionIconContainer}>
                          <Image
                            source={{ uri: "https://cdn-icons-png.flaticon.com/512/684/684908.png" }}
                            style={styles.suggestionIcon}
                          />
                        </View>
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionMainText}>{suggestion.main_text}</Text>
                          <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                            {suggestion.secondary_text}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                {/* Drop Input */}
                <View style={styles.inputContainer}>
                  <LinearGradient
                    colors={['#FF6B6B', '#6E44FF']}
                    style={styles.inputIconContainer}
                  >
                    <Image
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" }}
                      style={styles.inputIcon}
                    />
                  </LinearGradient>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter drop location"
                    placeholderTextColor="#888"
                    value={drop}
                    onChangeText={(text) => {
                      setDrop(text);
                      if (!text.trim()) {
                        setDropCoords(null);
                        setShowDropSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (dropSuggestions.length > 0) {
                        setShowDropSuggestions(true);
                      }
                    }}
                  />
                  {isLoadingDropSuggestions && (
                    <ActivityIndicator size="small" color="#6E44FF" style={{ marginRight: 8 }} />
                  )}
                </View>

                {/* Drop Suggestions Dropdown */}
                {showDropSuggestions && dropSuggestions.length > 0 && (
                  <ScrollView 
                    style={styles.suggestionsContainer}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    {dropSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={suggestion.place_id || index}
                        style={styles.suggestionItem}
                        onPress={() => handlePlaceSelect(suggestion.place_id, suggestion.description, false)}
                      >
                        <View style={styles.suggestionIconContainer}>
                          <Image
                            source={{ uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" }}
                            style={styles.suggestionIcon}
                          />
                        </View>
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionMainText}>{suggestion.main_text}</Text>
                          <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                            {suggestion.secondary_text}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                <TouchableOpacity 
                  style={[styles.bookButton, isBooking && styles.disabledButton]} 
                  onPress={handleBookRide}
                  disabled={isBooking}
                >
                  <LinearGradient 
                    colors={isBooking ? ["#ccc", "#999"] : ["#FF6B6B", "#6E44FF"]} 
                    style={styles.bookButtonGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                  >
                    {isBooking ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" style={{ marginRight: 12 }} />
                        <Text style={styles.bookButtonText}>Booking...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.bookButtonText}>Book Ride Now</Text>
                        <Image
                          source={{ uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" }}
                          style={styles.bookButtonIcon}
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Booking Status */}
                {isBooking && bookingStatus && (
                  <View style={styles.bookingStatusContainer}>
                    <Text style={styles.bookingStatusText}>{bookingStatus}</Text>
                    {driverQueue.length > 0 && (
                      <View style={styles.driverQueueInfo}>
                        <Text style={styles.driverQueueTitle}>Driver Queue:</Text>
                        {driverQueue.map((driver, index) => (
                          <Text key={driver.id} style={styles.driverQueueItem}>
                            {index + 1}. {driver.fullName} - {driver.distanceFromPickup} km away
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );

      case "RecentRides":
        return (
          <View style={styles.contentBox}>
            <Text style={styles.title}>Recent Rides</Text>
            {recentRides.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#FF6B6B', '#6E44FF']}
                  style={styles.emptyStateIconContainer}
                >
                  <Image
                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" }}
                    style={styles.emptyStateIcon}
                  />
                </LinearGradient>
                <Text style={styles.emptyStateText}>No rides yet</Text>
                <Text style={styles.emptyStateSubText}>Book your first ride to see it here!</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.ridesScrollView}>
                {recentRides.map((ride) => (
                  <LinearGradient
                    key={ride.id}
                    colors={['#FFFFFF', '#F8FBF8']}
                    style={styles.rideCard}
                  >
                    <View style={styles.rideHeader}>
                      <Text style={styles.rideDate}>
                        {ride.date} • {ride.time}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          ride.status === "Completed" ? styles.completedBadge : styles.bookedBadge,
                        ]}
                      >
                        <Text style={styles.statusText}>{ride.status}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.rideDetails}>
                      <View style={styles.locationRow}>
                        <LinearGradient
                          colors={['#6E44FF', '#8A6EFF']}
                          style={[styles.dot, styles.pickupDot]}
                        />
                        <Text style={styles.locationText} numberOfLines={2}>{ride.pickup}</Text>
                      </View>
                      
                      <View style={styles.dividerLine} />
                      
                      <View style={styles.locationRow}>
                        <LinearGradient
                          colors={['#FF6B6B', '#FF8A8A']}
                          style={[styles.dot, styles.dropDot]}
                        />
                        <Text style={styles.locationText} numberOfLines={2}>{ride.drop}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.rideFooter}>
                      <Text style={styles.fareText}>₹{ride.fare}</Text>
                    </View>
                  </LinearGradient>
                ))}
              </ScrollView>
            )}
          </View>
        );

      case "MyDetails":
        return (
          <View style={styles.contentBox}>
            <Text style={styles.title}>My Profile</Text>
            {user ? (
              <View style={styles.profileContainer}>
                <LinearGradient
                  colors={['#FF6B6B', '#6E44FF']}
                  style={styles.profileImageContainer}
                >
                  {user.profilePhoto ? (
                    <Image source={{ uri: user.profilePhoto }} style={styles.profileImage} />
                  ) : (
                    <Image
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
                      style={styles.placeholderIcon}
                    />
                  )}
                </LinearGradient>
                
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <LinearGradient
                        colors={['#FF6B6B', '#6E44FF']}
                        style={styles.detailIconContainer}
                      >
                        <Image
                          source={{ uri: "https://cdn-icons-png.flaticon.com/512/126/126341.png" }}
                          style={styles.detailIcon}
                        />
                      </LinearGradient>
                      <Text style={styles.detailText}>{user.phone || "Not provided"}</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <LinearGradient
                        colors={['#FF6B6B', '#6E44FF']}
                        style={styles.detailIconContainer}
                      >
                        <Image
                          source={{ uri: "https://cdn-icons-png.flaticon.com/512/2922/2922561.png" }}
                          style={styles.detailIcon}
                        />
                      </LinearGradient>
                      <Text style={styles.detailText}>{user.gender || "Not specified"}</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <LinearGradient
                        colors={['#FF6B6B', '#6E44FF']}
                        style={styles.detailIconContainer}
                      >
                        <Image
                          source={{ uri: "https://cdn-icons-png.flaticon.com/512/747/747310.png" }}
                          style={styles.detailIcon}
                        />
                      </LinearGradient>
                      <Text style={styles.detailText}>{user.dateOfBirth || "Not provided"}</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <LinearGradient
                        colors={['#FF6B6B', '#6E44FF']}
                        style={styles.detailIconContainer}
                      >
                        <Image
                          source={{ uri: "https://cdn-icons-png.flaticon.com/512/484/484167.png" }}
                          style={styles.detailIcon}
                        />
                      </LinearGradient>
                      <Text style={styles.detailText} numberOfLines={1}>
                        {user.address || "Address not provided"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#FF6B6B', '#6E44FF']}
                  style={styles.emptyStateIconContainer}
                >
                  <Image
                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/1077/1077063.png" }}
                    style={styles.emptyStateIcon}
                  />
                </LinearGradient>
                <Text style={styles.emptyStateText}>User details not available</Text>
                <Text style={styles.emptyStateSubText}>Please log in to view your profile</Text>
              </View>
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Elements */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
      </View>

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Welcome back, {user ? user.fullName : "Rider"}</Text>
        <Text style={styles.subheader}>Ready for your next ride?</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: "BookRide", label: "Book Ride", icon: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" },
          { key: "RecentRides", label: "Recent Rides", icon: "https://cdn-icons-png.flaticon.com/512/2997/2997898.png" },
          { key: "MyDetails", label: "My Details", icon: "https://cdn-icons-png.flaticon.com/512/1077/1077114.png" }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <LinearGradient
              colors={activeTab === tab.key ? ['#FF6B6B', '#6E44FF'] : ['#FFFFFF', '#F8FBF8']}
              style={styles.tabButtonContent}
            >
              <Image
                source={{ uri: tab.icon }}
                style={[styles.tabIcon, activeTab === tab.key && styles.activeTabIcon]}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBF8',
  },
  backgroundContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.1,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: '#FF6B6B',
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: '#6E44FF',
    bottom: 100,
    left: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    backgroundColor: '#FF8A8A',
    top: '40%',
    right: 20,
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 25,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2D3436',
    marginBottom: 4,
    letterSpacing: -0.8,
  },
  subheader: {
    fontSize: 15,
    color: '#636E72',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(110, 68, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabButtonContent: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTab: {
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    transform: [{ scale: 1.02 }],
  },
  tabIcon: {
    width: 26,
    height: 26,
    marginBottom: 6,
    tintColor: '#666',
  },
  activeTabIcon: {
    tintColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mapContainer: {
    marginBottom: 20,
  },
  mapWrapper: {
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(110, 68, 255, 0.1)',
  },
  map: {
    flex: 1,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  routeInfoBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 80,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  routeInfoGradient: {
    padding: 14,
    borderRadius: 16,
  },
  routeInfoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  routeFetchingIndicator: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    marginLeft: -65,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(110, 68, 255, 0.15)',
  },
  routeFetchingText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#6E44FF',
    fontWeight: '700',
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  locationButton: {
    alignItems: 'center',
  },
  locationButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  mapMarkerIcon: {
    width: 26,
    height: 26,
    tintColor: '#FFFFFF',
  },
  loadingIndicator: {
    marginTop: 8,
  },
  locationInputs: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(110, 68, 255, 0.08)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8E6FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    height: 54,
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '500',
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
  },
  suggestionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(110, 68, 255, 0.1)',
  },
  suggestionIcon: {
    width: 20,
    height: 20,
    tintColor: '#6E44FF',
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  suggestionSecondaryText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  bookButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginRight: 12,
    letterSpacing: 0.5,
  },
  bookButtonIcon: {
    width: 26,
    height: 26,
    tintColor: '#FFFFFF',
  },
  bookingStatusContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
  },
  bookingStatusText: {
    fontSize: 14,
    color: '#6E44FF',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  driverQueueInfo: {
    marginTop: 8,
  },
  driverQueueTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 8,
  },
  driverQueueItem: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 4,
    paddingLeft: 8,
  },
  contentBox: {
    flex: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2D3436',
    marginBottom: 24,
    letterSpacing: -0.6,
  },
  ridesScrollView: {
    flex: 1,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(110, 68, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  rideDate: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  bookedBadge: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2D3436',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rideDetails: {
    marginBottom: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  pickupDot: {
    backgroundColor: '#6E44FF',
  },
  dropDot: {
    backgroundColor: '#FF6B6B',
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dividerLine: {
    height: 1.5,
    backgroundColor: '#E8E6FF',
    marginVertical: 10,
    marginLeft: 7,
  },
  rideFooter: {
    alignItems: 'flex-end',
  },
  fareText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#6E44FF',
    letterSpacing: -0.5,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileImageContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderIcon: {
    width: 55,
    height: 55,
    tintColor: '#FFFFFF',
  },
  userInfo: {
    width: '100%',
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  etaContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 8,
  },
  etaTime: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  etaSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  tripProgressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  tripProgressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tripProgressEta: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  pocNotice: {
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  pocNoticeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  activeRideBanner: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  activeRideGradient: {
    padding: 24,
  },
  activeRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeRideTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    flex: 1,
  },
  activeRideStatusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeRideStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  driverInfoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  driverPhotoContainer: {
    marginRight: 14,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  driverDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  driverScooter: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  activeTripDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  activeTripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activeTripLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  activeTripValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  activeTripFare: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD700',
  },
  activeRideActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callDriverButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  callDriverText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6E44FF',
  },
  cancelRideButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  cancelRideText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },

  detailsGrid: {
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E6FF',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  detailIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  detailIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
  detailText: {
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 50,
  },
  emptyStateIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  emptyStateIcon: {
    width: 45,
    height: 45,
    tintColor: '#FFFFFF',
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default ConsumerHome;