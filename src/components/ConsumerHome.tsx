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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker } from "react-native-maps";
import LinearGradient from "react-native-linear-gradient";
import Geolocation from '@react-native-community/geolocation';

const { width } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: 19.0760,
  longitude: 72.8777,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const ConsumerHome: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"BookRide" | "RecentRides" | "MyDetails">("BookRide");
  const [user, setUser] = useState<any>(null);
  const [currentRegion, setCurrentRegion] = useState(DEFAULT_REGION);
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
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
    
    const locationTimer = setTimeout(() => {
      getCurrentLocation();
    }, 500);
    
    return () => {
      clearTimeout(locationTimer);
    };
  }, []);

  const refreshLocation = () => {
    if (!isLocationLoading) {
      getCurrentLocation();
    }
  };

  const handleBookRide = async () => {
    if (!pickup.trim() || !drop.trim()) {
      Alert.alert("Missing Information", "Please enter both pickup and drop locations");
      return;
    }

    if (pickup.trim().toLowerCase() === drop.trim().toLowerCase()) {
      Alert.alert("Invalid Route", "Pickup and drop locations cannot be the same");
      return;
    }

    const newRide = {
      id: Date.now(),
      pickup: pickup.trim(),
      drop: drop.trim(),
      fare: Math.floor(Math.random() * 200) + 100,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Booked",
    };

    try {
      const updatedRides = [newRide, ...recentRides];
      setRecentRides(updatedRides);
      
      await AsyncStorage.setItem("recentRides", JSON.stringify(updatedRides));
      
      Alert.alert(
        "Ride Booked Successfully!", 
        `From: ${newRide.pickup}\nTo: ${newRide.drop}\nFare: ₹${newRide.fare}`
      );
      
      setPickup("");
      setDrop("");
    } catch (error) {
      Alert.alert("Error", "Failed to save ride details. Please try again.");
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

  const renderContent = () => {
    switch (activeTab) {
      case "BookRide":
        return (
          <View style={styles.mapContainer}>
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
                {currentRegion && locationPermissionGranted && (
                  <Marker 
                    coordinate={currentRegion} 
                    title="Your Location"
                    pinColor="#6E44FF"
                  />
                )}
              </MapView>
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
            </View>

            <View style={styles.locationInputs}>
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
                  onChangeText={setPickup}
                />
              </View>
              
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
                  onChangeText={setDrop}
                />
              </View>
              
              <TouchableOpacity style={styles.bookButton} onPress={handleBookRide}>
                <LinearGradient 
                  colors={["#FF6B6B", "#6E44FF"]} 
                  style={styles.bookButtonGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <Text style={styles.bookButtonText}>Book Ride Now</Text>
                  <Image
                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" }}
                    style={styles.bookButtonIcon}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: 6,
    tintColor: '#666',
  },
  activeTabIcon: {
    tintColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mapContainer: {
    marginBottom: 20,
  },
  mapWrapper: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  map: {
    flex: 1,
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
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  mapMarkerIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  loadingIndicator: {
    marginTop: 8,
  },
  locationInputs: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8E6FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2D3436',
  },
  bookButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  bookButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  contentBox: {
    flex: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 20,
  },
  ridesScrollView: {
    flex: 1,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  bookedBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3436',
  },
  rideDetails: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  pickupDot: {
    backgroundColor: '#6E44FF',
  },
  dropDot: {
    backgroundColor: '#FF6B6B',
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E8E6FF',
    marginVertical: 8,
    marginLeft: 6,
  },
  rideFooter: {
    alignItems: 'flex-end',
  },
  fareText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6E44FF',
  },
  profileContainer: {
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  placeholderIcon: {
    width: 50,
    height: 50,
    tintColor: '#FFFFFF',
  },
  userInfo: {
    width: '100%',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailsGrid: {
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FBF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E6FF',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  detailText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateIcon: {
    width: 40,
    height: 40,
    tintColor: '#FFFFFF',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ConsumerHome;