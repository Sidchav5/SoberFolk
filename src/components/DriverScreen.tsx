import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  BackHandler
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import Geolocation from '@react-native-community/geolocation';

// Try multiple IPs for local network flexibility
const API_URLS = [
  "http://192.168.1.2:5000",    // New IP
  "http://10.139.99.126:5000",  // Original IP
];

const API_BASE_URL = __DEV__ 
  ? API_URLS[1]  // Change index to 0 or 1 to switch
  : "https://your-production-api.com";

const DriverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState("profile");
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  
  // Location states
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Booking system states
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [pollingInterval, setPollingInterval] = useState<any>(null);
    // Active ride state
    const [activeRide, setActiveRide] = useState<any>(null);
  // Hardcoded ride data
  const hardcodedRides = [
    {
      id: 1,
      pickup: "MG Road, Bangalore",
      drop: "Koramangala 5th Block",
      fare: 185,
      rating: 4.8,
      date: "2025-01-15",
      time: "14:30",
      distance: "4.2 km",
      duration: "18 min"
    },
    {
      id: 2,
      pickup: "Indiranagar Metro Station",
      drop: "HSR Layout",
      fare: 220,
      rating: 4.5,
      date: "2025-01-14",
      time: "09:15",
      distance: "5.7 km",
      duration: "22 min"
    },
    {
      id: 3,
      pickup: "Whitefield Main Road",
      drop: "Marathahalli Bridge",
      fare: 150,
      rating: 4.9,
      date: "2025-01-13",
      time: "17:45",
      distance: "3.5 km",
      duration: "15 min"
    },
    {
      id: 4,
      pickup: "Jayanagar 4th Block",
      drop: "BTM Layout",
      fare: 120,
      rating: 4.7,
      date: "2025-01-12",
      time: "11:20",
      distance: "2.8 km",
      duration: "12 min"
    }
  ];

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

  // Request Location Permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "SoberFolk needs access to your location to provide ride services",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Get Current Location
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Location permission is required to show your current location");
      setLocationLoading(false);
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
        console.log("📍 Trying network location (low accuracy)...");
        position = await tryGetLocation(false, 10000);
      } catch (networkError) {
        console.log("📍 Network location failed, trying GPS (high accuracy)...");
        position = await tryGetLocation(true, 30000);
      }
      
      if (position?.coords?.latitude && position?.coords?.longitude) {
        const { latitude, longitude } = position.coords;
        
        try {
          const token = await AsyncStorage.getItem("authToken");
          const response = await fetch(`${API_BASE_URL}/api/location/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await response.json();
          
          if (response.ok) {
            setCurrentLocation(data.location);
            Alert.alert("Success", "Location updated successfully!");
            console.log("✅ Location updated:", data.location);
          } else {
            Alert.alert("Error", data.error || "Failed to update location");
          }
        } catch (err) {
          console.error("Location update error:", err);
          Alert.alert("Error", "Failed to update location on server");
        }
      }
      
      setLocationLoading(false);
    } catch (error: any) {
      console.error("Final location error:", error);
      
      let errorMessage = "Could not fetch current location. ";
      
      switch (error.code) {
        case 1:
          errorMessage += "Location access denied. Please enable location permission in settings.";
          break;
        case 2:
          errorMessage += "Location unavailable. Please check if GPS is enabled.";
          break;
        case 3:
          errorMessage += "Location request timed out. Try moving to an area with better GPS signal or enable network location.";
          break;
        default:
          errorMessage += "Unknown error occurred. Please try again.";
      }
      
      Alert.alert("Location Error", errorMessage);
      setLocationLoading(false);
    }
  };

  // Fetch Stored Location from Server
  const fetchStoredLocation = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/location/current`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      
      if (response.ok) {
        setCurrentLocation(data);
      }
    } catch (err) {
      console.error("Fetch location error:", err);
    }
  };

  // Fetch Driver Profile
  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again");
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/driver/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setDriver(data);
      } else {
        Alert.alert("Error", data.error || "Failed to fetch profile");
        if (response.status === 403 || response.status === 401) {
          await AsyncStorage.removeItem("authToken");
          await AsyncStorage.removeItem("currentUser");
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchStoredLocation();
    fetchActiveRide();
  }, []);

  // Auto-update location when driver becomes available
  useEffect(() => {
    if (driver?.isAvailable && !currentLocation) {
      getCurrentLocation();
    }
  }, [driver?.isAvailable]);

  // Fetch pending rides
  const fetchPendingRides = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/driver/pending-rides`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPendingRides(data.pendingRides);
        
        // Show alert for new rides
        if (data.pendingRides.length > 0 && pendingRides.length === 0) {
          Alert.alert(
            "🚗 New Ride Request!",
            `Pickup: ${data.pendingRides[0].pickupAddress}\nDrop: ${data.pendingRides[0].dropAddress}\nFare: ₹${data.pendingRides[0].fare}`,
            [
              { text: "View", onPress: () => setActiveTab("status") }
            ]
          );
        }
      }
    } catch (error) {
      console.error("Fetch pending rides error:", error);
    }
  };

  // Start polling when driver is available
  useEffect(() => {
    if (driver?.isAvailable) {
      const interval = setInterval(fetchPendingRides, 5000); // Poll every 5 seconds
      setPollingInterval(interval);
      
      return () => clearInterval(interval);
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setPendingRides([]);
    }
  }, [driver?.isAvailable]);

  // Accept ride function
  const handleAcceptRide = async (rideId: number) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          "Ride Accepted! ✅",
          `Distance to Pickup: ${data.ride.distanceToPickup} km\nTotal Distance: ${data.ride.totalDistance} km\nFare: ₹${data.ride.fare}`,
          [{ text: "OK" }]
        );
        
        setPendingRides([]);
        fetchActiveRide(); // Add this line to refresh active ride status
      } else {
        Alert.alert("Error", data.error || "Failed to accept ride");
      }
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
    }
  };

  // Reject ride function
  const handleRejectRide = async (rideId: number) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await fetch(`${API_BASE_URL}/api/rides/${rideId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setPendingRides([]);
    } catch (error) {
      console.error("Reject ride error:", error);
    }
  };

    // Fetch active ride for driver
    // ... existing code ...

  // Fetch active ride for driver
  const fetchActiveRide = async () => {
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
      } else {
        setActiveRide(null);
      }
    } catch (error) {
      console.error("Failed to fetch active ride:", error);
      setActiveRide(null);
    }
  };
  // Remove the extra }; on line 431

  // Poll active ride every 10 seconds
  useEffect(() => {
    if (activeRide) {
      const pollInterval = setInterval(() => {
        fetchActiveRide();
        
        // Auto-check if ride is completed
        if (activeRide.status === 'completed') {
          Alert.alert(
            "Ride Completed! ✅",
            "The ride has been automatically completed (POC mode).\nYou're now available for new rides!",
            [{ text: "OK", onPress: () => setActiveRide(null) }]
          );
          clearInterval(pollInterval);
        }
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(pollInterval);
    }
  }, [activeRide]);

  // Fetch pending rides
    // Start ride function
    const handleStartRide = async (rideId: number) => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/start`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json();
  
        if (response.ok) {
          Alert.alert("Trip Started! 🚗", "You've started the trip. Drive safely!");
          fetchActiveRide(); // Refresh active ride
        } else {
          Alert.alert("Error", data.error || "Failed to start ride");
        }
      } catch (error) {
        Alert.alert("Error", "Network error occurred");
      }
    };
  
    // Complete ride function
    const handleCompleteRide = async (rideId: number) => {
      Alert.alert(
        "Complete Ride",
        "Are you sure you want to complete this ride?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Complete",
            onPress: async () => {
              try {
                const token = await AsyncStorage.getItem("authToken");
                const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/complete`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
  
                const data = await response.json();
  
                if (response.ok) {
                  Alert.alert("Ride Completed! ✅", "Great job! The ride has been completed.");
                  setActiveRide(null);
                  fetchActiveRide(); // Refresh
                } else {
                  Alert.alert("Error", data.error || "Failed to complete ride");
                }
              } catch (error) {
                Alert.alert("Error", "Network error occurred");
              }
            }
          }
        ]
      );
    };

  // Toggle Availability
  const toggleAvailability = async (value: boolean) => {
    if (!driver) return;
    setAvailabilityLoading(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(
        `${API_BASE_URL}/driver/${driver.id}/availability`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAvailable: value }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setDriver({ ...driver, isAvailable: data.isAvailable });
        
        // Update location when going online
        if (value) {
          getCurrentLocation();
        }
      } else {
        Alert.alert("Error", data.error || "Failed to update availability");
      }
    } catch (err) {
      console.error("Availability update error:", err);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Render Tab Content
  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#6E44FF" style={styles.loader} />;

    if (!driver) return <Text style={styles.noProfileText}>No profile found</Text>;

    switch (activeTab) {
      case "profile":
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Driver Profile</Text>
            
            <LinearGradient
              colors={['#FF6B6B', '#6E44FF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.profileHeader}
            >
              <Image
                source={{ uri: driver.profilePhoto || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
                style={styles.profilePic}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{driver.fullName}</Text>
                <Text style={styles.subText}>
                  Professional Driver • {driver.scooterModel || "Electric Scooter"}
                </Text>
                <View style={[styles.statusBadge, driver.isAvailable ? styles.availableBadge : styles.offlineBadge]}>
                  <Text style={styles.statusText}>
                    {driver.isAvailable ? "Available" : "Offline"}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Current Location Card */}
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <Image 
                  source={{ uri: "https://cdn-icons-png.flaticon.com/512/854/854878.png" }} 
                  style={styles.locationHeaderIcon} 
                />
                <Text style={styles.locationCardTitle}>Current Location</Text>
                <TouchableOpacity 
                  onPress={getCurrentLocation}
                  disabled={locationLoading}
                  style={styles.refreshButton}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#6E44FF" />
                  ) : (
                    <Image 
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/2961/2961948.png" }} 
                      style={styles.refreshIcon} 
                    />
                  )}
                </TouchableOpacity>
              </View>

              {currentLocation ? (
                <View style={styles.locationDetails}>
                  <View style={styles.locationInfoRow}>
                    <Image 
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/684/684908.png" }} 
                      style={styles.locationIcon} 
                    />
                    <View style={styles.locationTextContainer}>
                      <Text style={styles.locationLabel}>Place Name</Text>
                      <Text style={styles.locationValue}>{currentLocation.address || "Unknown Location"}</Text>
                    </View>
                  </View>

                  <View style={styles.coordinatesContainer}>
                    <View style={styles.coordinateBox}>
                      <Text style={styles.coordinateLabel}>Latitude</Text>
                      <Text style={styles.coordinateValue}>
                        {currentLocation.latitude?.toFixed(6) || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.coordinateBox}>
                      <Text style={styles.coordinateLabel}>Longitude</Text>
                      <Text style={styles.coordinateValue}>
                        {currentLocation.longitude?.toFixed(6) || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {currentLocation.lastUpdated && (
                    <Text style={styles.lastUpdated}>
                      Last updated: {new Date(currentLocation.lastUpdated).toLocaleString()}
                    </Text>
                  )}
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.enableLocationButton}
                  onPress={getCurrentLocation}
                  disabled={locationLoading}
                >
                  <Image 
                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/854/854901.png" }} 
                    style={styles.enableLocationIcon} 
                  />
                  <Text style={styles.enableLocationText}>
                    {locationLoading ? "Getting location..." : "Enable Location Tracking"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/561/561127.png" }} style={styles.infoIcon} />
                </View>
                <Text style={styles.infoLabel}>Email: {driver.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/126/126341.png" }} style={styles.infoIcon} />
                </View>
                <Text style={styles.infoLabel}>Phone: {driver.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/2922/2922561.png" }} style={styles.infoIcon} />
                </View>
                <Text style={styles.infoLabel}>Gender: {driver.gender}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/747/747310.png" }} style={styles.infoIcon} />
                </View>
                <Text style={styles.infoLabel}>DOB: {driver.dateOfBirth}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/484/484167.png" }} style={styles.infoIcon} />
                </View>
                <Text style={styles.infoLabel}>Address: {driver.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/1570/1570918.png" }} style={styles.infoIcon} />
                </View>
                <Text style={styles.infoLabel}>Aadhar: {driver.aadharNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/2997/2997898.png" }} style={styles.infoIcon} />
                </View>
                <Text style={styles.infoLabel}>License: {driver.licenseNumber}</Text>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available for Service</Text>
              <Switch
                value={driver.isAvailable}
                onValueChange={toggleAvailability}
                thumbColor={driver.isAvailable ? "#6E44FF" : "#f4f3f4"}
                trackColor={{ false: "#767577", true: "#FF6B6B" }}
                disabled={availabilityLoading}
              />
            </View>
          </ScrollView>
        );

      case "rides":
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Recent Rides</Text>
            
            {hardcodedRides.map((ride) => (
              <View key={ride.id} style={styles.rideCard}>
                <View style={styles.rideHeader}>
                  <Text style={styles.rideDate}>{ride.date} at {ride.time}</Text>
                  <View style={styles.ratingBadge}>
                    <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png" }} style={styles.starIcon} />
                    <Text style={styles.ratingText}>{ride.rating}</Text>
                  </View>
                </View>
                
                <View style={styles.rideDetails}>
                  <View style={styles.locationRow}>
                    <View style={[styles.dot, styles.pickupDot]} />
                    <Text style={styles.locationText}>{ride.pickup}</Text>
                  </View>
                  
                  <View style={styles.dividerLine} />
                  
                  <View style={styles.locationRow}>
                    <View style={[styles.dot, styles.dropDot]} />
                    <Text style={styles.locationText}>{ride.drop}</Text>
                  </View>
                </View>
                
                <View style={styles.rideFooter}>
                  <View style={styles.rideStat}>
                    <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/854/854878.png" }} style={styles.statIcon} />
                    <Text style={styles.statText}>{ride.distance}</Text>
                  </View>
                  
                  <View style={styles.rideStat}>
                    <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/2088/2088617.png" }} style={styles.statIcon} />
                    <Text style={styles.statText}>{ride.duration}</Text>
                  </View>
                  
                  <View style={styles.fareContainer}>
                    <Text style={styles.fareText}>₹{ride.fare}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        );

        case "status":
          return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Current Status</Text>
              
              {/* Active Ride Section */}
              {activeRide && (
                <View style={styles.activeRideSection}>
                  <LinearGradient
                    colors={['#00C853', '#00E676']}
                    style={styles.activeRideCard}
                  >
                    {/* POC Notice */}
                    <View style={styles.pocNoticeBanner}>
                      <Text style={styles.pocNoticeText}>
                        🤖 POC AUTO-MODE: Ride will complete in 5 minutes
                      </Text>
                    </View>
  
                    <Text style={styles.activeRideTitle}>
                      {activeRide.status === 'accepted' ? '🚗 Active Ride - On the way' : '🛣️ Trip in Progress'}
                    </Text>
                    
                    <View style={styles.activeRideDetails}>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Consumer:</Text>
                        <Text style={styles.activeRideValue}>{activeRide.consumer?.name || 'N/A'}</Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Phone:</Text>
                        <Text style={styles.activeRideValue}>{activeRide.consumer?.phone || 'N/A'}</Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Pickup:</Text>
                        <Text style={styles.activeRideValue} numberOfLines={2}>
                          {activeRide.pickup.address}
                        </Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Drop:</Text>
                        <Text style={styles.activeRideValue} numberOfLines={2}>
                          {activeRide.drop.address}
                        </Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Distance:</Text>
                        <Text style={styles.activeRideValue}>{activeRide.distance} km</Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Fare:</Text>
                        <Text style={styles.activeRideFare}>₹{activeRide.fare}</Text>
                      </View>
                    </View>
  
                    {/* Action Buttons */}
                    <View style={styles.activeRideActions}>
                      {activeRide.status === 'accepted' && (
                        <TouchableOpacity
                          style={styles.startRideButton}
                          onPress={() => handleStartRide(activeRide.id)}
                        >
                          <Text style={styles.startRideButtonText}>▶️ Start Trip</Text>
                        </TouchableOpacity>
                      )}
                      
                      {activeRide.status === 'in_progress' && (
                        <TouchableOpacity
                          style={styles.completeRideButton}
                          onPress={() => handleCompleteRide(activeRide.id)}
                        >
                          <Text style={styles.completeRideButtonText}>✓ Complete Ride</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity
                        style={styles.callConsumerButton}
                        onPress={() => {
                          Alert.alert(
                            "Call Consumer",
                            `Would you like to call ${activeRide.consumer?.name}?\n${activeRide.consumer?.phone}`,
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Call", onPress: () => console.log("Calling consumer...") }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.callConsumerButtonText}>📞 Call</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )}
              
              {/* Pending Ride Requests */}
              {pendingRides.length > 0 && (
                <View style={styles.pendingRidesSection}>
                  <Text style={styles.pendingRidesTitle}>🔔 Incoming Ride Request</Text>
                  {pendingRides.map((ride) => (
                    <LinearGradient
                      key={ride.rideId}
                      colors={['#FF6B6B', '#6E44FF']}
                      style={styles.pendingRideCard}
                    >
                      <Text style={styles.pendingRideLabel}>Pickup Location:</Text>
                      <Text style={styles.pendingRideValue}>{ride.pickupAddress}</Text>
                      
                      <Text style={styles.pendingRideLabel}>Drop Location:</Text>
                      <Text style={styles.pendingRideValue}>{ride.dropAddress}</Text>
                      
                      <View style={styles.pendingRideStats}>
                        <View style={styles.pendingRideStat}>
                          <Text style={styles.pendingRideStatLabel}>Distance to Pickup</Text>
                          <Text style={styles.pendingRideStatValue}>{ride.distanceToPickup} km</Text>
                        </View>
                        <View style={styles.pendingRideStat}>
                          <Text style={styles.pendingRideStatLabel}>Total Distance</Text>
                          <Text style={styles.pendingRideStatValue}>{ride.totalDistance} km</Text>
                        </View>
                        <View style={styles.pendingRideStat}>
                          <Text style={styles.pendingRideStatLabel}>Fare</Text>
                          <Text style={styles.pendingRideStatValue}>₹{ride.fare}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.pendingRideActions}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAcceptRide(ride.rideId)}
                        >
                          <Text style={styles.acceptButtonText}>✓ Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleRejectRide(ride.rideId)}
                        >
                          <Text style={styles.rejectButtonText}>✗ Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  ))}
                </View>
              )}
              
              <LinearGradient
                colors={['#FF6B6B', '#6E44FF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.statusCard}
              >
                <Text style={styles.statusCardTitle}>Driver Status Overview</Text>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3474/3474362.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>Pending Requests: {pendingRides.length}</Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/190/190411.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>
                    Status: {driver.isAvailable ? "Available" : "Offline"}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135716.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>Active Ride: {activeRide ? 'Yes' : 'No'}</Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/477/477406.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>Overall Rating: 4.8</Text>
                </View>
              </LinearGradient>
            </ScrollView>
          );
          return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Current Status</Text>
              
              {/* Active Ride Section */}
              {activeRide && (
                <View style={styles.activeRideSection}>
                  <LinearGradient
                    colors={['#00C853', '#00E676']}
                    style={styles.activeRideCard}
                  >
                    <Text style={styles.activeRideTitle}>
                      {activeRide.status === 'accepted' ? '🚗 Active Ride - On the way' : '🛣️ Trip in Progress'}
                    </Text>
                    
                    <View style={styles.activeRideDetails}>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Consumer:</Text>
                        <Text style={styles.activeRideValue}>{activeRide.consumer?.name || 'N/A'}</Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Phone:</Text>
                        <Text style={styles.activeRideValue}>{activeRide.consumer?.phone || 'N/A'}</Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Pickup:</Text>
                        <Text style={styles.activeRideValue} numberOfLines={2}>
                          {activeRide.pickup.address}
                        </Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Drop:</Text>
                        <Text style={styles.activeRideValue} numberOfLines={2}>
                          {activeRide.drop.address}
                        </Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Distance:</Text>
                        <Text style={styles.activeRideValue}>{activeRide.distance} km</Text>
                      </View>
                      <View style={styles.activeRideRow}>
                        <Text style={styles.activeRideLabel}>Fare:</Text>
                        <Text style={styles.activeRideFare}>₹{activeRide.fare}</Text>
                      </View>
                    </View>
  
                    {/* Action Buttons */}
                    <View style={styles.activeRideActions}>
                      {activeRide.status === 'accepted' && (
                        <TouchableOpacity
                          style={styles.startRideButton}
                          onPress={() => handleStartRide(activeRide.id)}
                        >
                          <Text style={styles.startRideButtonText}>▶️ Start Trip</Text>
                        </TouchableOpacity>
                      )}
                      
                      {activeRide.status === 'in_progress' && (
                        <TouchableOpacity
                          style={styles.completeRideButton}
                          onPress={() => handleCompleteRide(activeRide.id)}
                        >
                          <Text style={styles.completeRideButtonText}>✓ Complete Ride</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity
                        style={styles.callConsumerButton}
                        onPress={() => {
                          Alert.alert(
                            "Call Consumer",
                            `Would you like to call ${activeRide.consumer?.name}?\n${activeRide.consumer?.phone}`,
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Call", onPress: () => console.log("Calling consumer...") }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.callConsumerButtonText}>📞 Call</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )}
              
              {/* Pending Ride Requests */}
              {pendingRides.length > 0 && (
                <View style={styles.pendingRidesSection}>
                  <Text style={styles.pendingRidesTitle}>🔔 Incoming Ride Request</Text>
                  {pendingRides.map((ride) => (
                    <LinearGradient
                      key={ride.rideId}
                      colors={['#FF6B6B', '#6E44FF']}
                      style={styles.pendingRideCard}
                    >
                      <Text style={styles.pendingRideLabel}>Pickup Location:</Text>
                      <Text style={styles.pendingRideValue}>{ride.pickupAddress}</Text>
                      
                      <Text style={styles.pendingRideLabel}>Drop Location:</Text>
                      <Text style={styles.pendingRideValue}>{ride.dropAddress}</Text>
                      
                      <View style={styles.pendingRideStats}>
                        <View style={styles.pendingRideStat}>
                          <Text style={styles.pendingRideStatLabel}>Distance to Pickup</Text>
                          <Text style={styles.pendingRideStatValue}>{ride.distanceToPickup} km</Text>
                        </View>
                        <View style={styles.pendingRideStat}>
                          <Text style={styles.pendingRideStatLabel}>Total Distance</Text>
                          <Text style={styles.pendingRideStatValue}>{ride.totalDistance} km</Text>
                        </View>
                        <View style={styles.pendingRideStat}>
                          <Text style={styles.pendingRideStatLabel}>Fare</Text>
                          <Text style={styles.pendingRideStatValue}>₹{ride.fare}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.pendingRideActions}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAcceptRide(ride.rideId)}
                        >
                          <Text style={styles.acceptButtonText}>✓ Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleRejectRide(ride.rideId)}
                        >
                          <Text style={styles.rejectButtonText}>✗ Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  ))}
                </View>
              )}
              
              <LinearGradient
                colors={['#FF6B6B', '#6E44FF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.statusCard}
              >
                <Text style={styles.statusCardTitle}>Driver Status Overview</Text>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3474/3474362.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>Pending Requests: {pendingRides.length}</Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/190/190411.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>
                    Status: {driver.isAvailable ? "Available" : "Offline"}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135716.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>Active Ride: {activeRide ? 'Yes' : 'No'}</Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/477/477406.png" }} style={styles.statusIcon} />
                  <Text style={styles.statusLabel}>Overall Rating: 4.8</Text>
                </View>
              </LinearGradient>
            </ScrollView>
          );
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Current Status</Text>
            
            {/* Pending Ride Requests */}
            {pendingRides.length > 0 && (
              <View style={styles.pendingRidesSection}>
                <Text style={styles.pendingRidesTitle}>🔔 Incoming Ride Request</Text>
                {pendingRides.map((ride) => (
                  <LinearGradient
                    key={ride.rideId}
                    colors={['#FF6B6B', '#6E44FF']}
                    style={styles.pendingRideCard}
                  >
                    <Text style={styles.pendingRideLabel}>Pickup Location:</Text>
                    <Text style={styles.pendingRideValue}>{ride.pickupAddress}</Text>
                    
                    <Text style={styles.pendingRideLabel}>Drop Location:</Text>
                    <Text style={styles.pendingRideValue}>{ride.dropAddress}</Text>
                    
                    <View style={styles.pendingRideStats}>
                      <View style={styles.pendingRideStat}>
                        <Text style={styles.pendingRideStatLabel}>Distance to Pickup</Text>
                        <Text style={styles.pendingRideStatValue}>{ride.distanceToPickup} km</Text>
                      </View>
                      <View style={styles.pendingRideStat}>
                        <Text style={styles.pendingRideStatLabel}>Total Distance</Text>
                        <Text style={styles.pendingRideStatValue}>{ride.totalDistance} km</Text>
                      </View>
                      <View style={styles.pendingRideStat}>
                        <Text style={styles.pendingRideStatLabel}>Fare</Text>
                        <Text style={styles.pendingRideStatValue}>₹{ride.fare}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.pendingRideActions}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptRide(ride.rideId)}
                      >
                        <Text style={styles.acceptButtonText}>✓ Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleRejectRide(ride.rideId)}
                      >
                        <Text style={styles.rejectButtonText}>✗ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}
            
            <LinearGradient
              colors={['#FF6B6B', '#6E44FF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.statusCard}
            >
              <Text style={styles.statusCardTitle}>Driver Status Overview</Text>
              
              <View style={styles.statusItem}>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3474/3474362.png" }} style={styles.statusIcon} />
                <Text style={styles.statusLabel}>Pending Requests: {pendingRides.length}</Text>
              </View>
              
              <View style={styles.statusItem}>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/190/190411.png" }} style={styles.statusIcon} />
                <Text style={styles.statusLabel}>
                  Status: {driver.isAvailable ? "Available" : "Offline"}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135716.png" }} style={styles.statusIcon} />
                <Text style={styles.statusLabel}>Today's Earnings: ₹0</Text>
              </View>
              
              <View style={styles.statusItem}>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/477/477406.png" }} style={styles.statusIcon} />
                <Text style={styles.statusLabel}>Overall Rating: 4.8</Text>
              </View>
            </LinearGradient>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Elements */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
        
        <View style={styles.abstractPattern} />
      </View>

      <View style={styles.mainContent}>{renderContent()}</View>

      {/* Bottom Navigation */}
      <LinearGradient
        colors={['#FFFFFF', '#F8FBF8']}
        style={styles.bottomBar}
      >
        <TouchableOpacity 
          onPress={() => setActiveTab("profile")}
          style={styles.tabButton}
        >
          <Image 
            source={{ uri: activeTab === "profile" ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" : "https://cdn-icons-png.flaticon.com/512/1077/1077063.png" }} 
            style={[styles.tabIcon, activeTab === "profile" && styles.activeTabIcon]}
          />
          <Text style={[styles.tabLabel, activeTab === "profile" && styles.activeTabLabel]}>
            Profile
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setActiveTab("rides")}
          style={styles.tabButton}
        >
          <Image 
            source={{ uri: activeTab === "rides" ? "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" : "https://cdn-icons-png.flaticon.com/512/2972/2972186.png" }} 
            style={[styles.tabIcon, activeTab === "rides" && styles.activeTabIcon]}
          />
          <Text style={[styles.tabLabel, activeTab === "rides" && styles.activeTabLabel]}>
            Rides
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setActiveTab("status")}
          style={styles.tabButton}
        >
          <Image 
            source={{ uri: activeTab === "status" ? "https://cdn-icons-png.flaticon.com/512/1828/1828636.png" : "https://cdn-icons-png.flaticon.com/512/1828/1828643.png" }} 
            style={[styles.tabIcon, activeTab === "status" && styles.activeTabIcon]}
          />
          <Text style={[styles.tabLabel, activeTab === "status" && styles.activeTabLabel]}>
            Status
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

export default DriverScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FBF8",
  },
  backgroundContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.08,
  },
  circle1: {
    width: 250,
    height: 250,
    backgroundColor: '#FF6B6B',
    top: -80,
    right: -80,
  },
  circle2: {
    width: 180,
    height: 180,
    backgroundColor: '#6E44FF',
    bottom: 80,
    left: -50,
  },
  circle3: {
    width: 120,
    height: 120,
    backgroundColor: '#FF8A8A',
    top: '45%',
    right: 10,
  },
  abstractPattern: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#6E44FF',
    opacity: 0.04,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
  mainContent: { 
    flex: 1, 
    padding: 20,
    paddingTop: 50,
    zIndex: 1,
  },
  content: { 
    flex: 1,
  },
  loader: { 
    marginTop: 50,
  },
  noProfileText: { 
    textAlign: "center", 
    fontSize: 16, 
    color: "#636E72", 
    marginTop: 50,
    fontWeight: '500',
  },
  
  title: { 
    fontSize: 28, 
    fontWeight: "900", 
    marginBottom: 24, 
    color: "#2D3436",
    textAlign: "center",
    letterSpacing: -0.6,
  },
  
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    padding: 24,
    borderRadius: 24,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePic: { 
    width: 90, 
    height: 90, 
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileInfo: { 
    marginLeft: 18,
    flex: 1,
  },
  name: { 
    fontSize: 22, 
    fontWeight: "900", 
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subText: { 
    fontSize: 13, 
    color: "rgba(255, 255, 255, 0.92)",
    marginBottom: 10,
    fontWeight: '500',
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  availableBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  offlineBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  // Location Card Styles
  locationCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(110, 68, 255, 0.08)',
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F5F5F5',
  },
  locationHeaderIcon: {
    width: 26,
    height: 26,
    tintColor: '#6E44FF',
    marginRight: 10,
  },
  locationCardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2D3436",
    flex: 1,
    letterSpacing: -0.4,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshIcon: {
    width: 22,
    height: 22,
    tintColor: '#6E44FF',
  },
  locationDetails: {
    gap: 18,
  },
  locationInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: "#F0F0F0",
  },
  locationIcon: {
    width: 22,
    height: 22,
    tintColor: '#FF6B6B',
    marginRight: 14,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: "#636E72",
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 15,
    color: "#2D3436",
    fontWeight: "600",
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  coordinatesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  coordinateBox: {
    flex: 1,
    backgroundColor: "#F8F9FF",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#6E44FF",
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  coordinateLabel: {
    fontSize: 10,
    color: "#636E72",
    marginBottom: 6,
    fontWeight: "800",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coordinateValue: {
    fontSize: 13,
    color: "#2D3436",
    fontWeight: "800",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -0.5,
  },
  lastUpdated: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
    fontWeight: '500',
  },
  enableLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#6E44FF",
    borderStyle: "dashed",
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  enableLocationIcon: {
    width: 26,
    height: 26,
    tintColor: '#6E44FF',
    marginRight: 10,
  },
  enableLocationText: {
    fontSize: 15,
    color: "#6E44FF",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  
  infoCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(110, 68, 255, 0.08)',
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoIconContainer: {
    width: 42,
    height: 42,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderRadius: 21,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoIcon: {
    width: 22,
    height: 22,
    tintColor: '#6E44FF',
  },
  infoLabel: { 
    fontSize: 14, 
    color: "#2D3436",
    flex: 1,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(110, 68, 255, 0.08)',
  },
  switchLabel: { 
    fontSize: 17, 
    fontWeight: "800",
    color: "#2D3436",
    letterSpacing: -0.3,
  },
  
  // Rides Tab Styles
  rideCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 18,
    shadowColor: "#6E44FF",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rideDate: {
    fontSize: 12,
    color: "#636E72",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  starIcon: {
    width: 13,
    height: 13,
    tintColor: '#FFFFFF',
    marginRight: 5,
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  rideDetails: {
    marginBottom: 18,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  pickupDot: {
    backgroundColor: "#6E44FF",
  },
  dropDot: {
    backgroundColor: "#FF6B6B",
  },
  locationText: {
    fontSize: 14,
    color: "#2D3436",
    flex: 1,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dividerLine: {
    height: 1.5,
    backgroundColor: "#E8E6FF",
    marginVertical: 10,
    marginLeft: 5,
  },
  rideFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#F5F5F5',
  },
  rideStat: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#F8F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statIcon: {
    width: 15,
    height: 15,
    tintColor: '#6E44FF',
    marginRight: 5,
  },
  statText: {
    fontSize: 12,
    color: "#6E44FF",
    fontWeight: '700',
  },
  fareContainer: {
    backgroundColor: "#6E44FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fareText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  
  // Pending Rides Section
  pendingRidesSection: {
    marginBottom: 24,
  },
  pendingRidesTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D3436',
    marginBottom: 16,
    textAlign: 'center',
  },
  pendingRideCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  pendingRideLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  pendingRideValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  pendingRideStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  pendingRideStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  pendingRideStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingRideStatValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  pendingRideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#00C853',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Status Tab Styles
  statusCard: {
    padding: 28,
    borderRadius: 24,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusCardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
    marginRight: 14,
  },
  statusLabel: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  
  // Bottom Navigation
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderColor: "#E8E6FF",
    zIndex: 1,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabButton: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  tabIcon: {
    width: 26,
    height: 26,
    tintColor: '#636E72',
    marginBottom: 6,
  },
  activeTabIcon: {
    tintColor: '#6E44FF',
  },
  tabLabel: {
    fontSize: 11,
    color: "#636E72",
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeTabLabel: {
    color: "#6E44FF",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
    // Active Ride Styles
    activeRideSection: {
      marginBottom: 24,
    },
    activeRideCard: {
      padding: 24,
      borderRadius: 24,
      shadowColor: '#00C853',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    activeRideTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: '#FFFFFF',
      marginBottom: 20,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    activeRideDetails: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    activeRideRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    activeRideLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: 'rgba(255, 255, 255, 0.9)',
      width: 80,
    },
    activeRideValue: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    activeRideFare: {
      fontSize: 20,
      fontWeight: '900',
      color: '#FFD700',
      letterSpacing: -0.5,
    },
    activeRideActions: {
      flexDirection: 'row',
      gap: 12,
    },
    startRideButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    startRideButtonText: {
      color: '#00C853',
      fontSize: 16,
      fontWeight: '900',
    },
    completeRideButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    completeRideButtonText: {
      color: '#00C853',
      fontSize: 16,
      fontWeight: '900',
    },
    callConsumerButton: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    callConsumerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    callConsumerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    pocNoticeBanner: {
      backgroundColor: 'rgba(255, 193, 7, 0.9)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: '#FFA000',
    },
    pocNoticeText: {
      fontSize: 13,
      color: '#000000',
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: 0.3,
    },
});
