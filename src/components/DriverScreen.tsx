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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";

const API_BASE_URL = __DEV__ 
  ? "http://10.139.99.126:5000" 
  : "https://your-production-api.com";

const DriverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState("profile");
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

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

  // ---- Fetch Driver Profile ----
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
          // Token invalid/expired
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
  }, []);

  // ---- Toggle Availability ----
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

  // ---- Render Tab Content ----
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
          <View style={styles.content}>
            <Text style={styles.title}>Current Status</Text>
            
            <LinearGradient
              colors={['#FF6B6B', '#6E44FF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.statusCard}
            >
              <Text style={styles.statusCardTitle}>Driver Status Overview</Text>
              
              <View style={styles.statusItem}>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3474/3474362.png" }} style={styles.statusIcon} />
                <Text style={styles.statusLabel}>Current Ride: None</Text>
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
          </View>
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
        
        {/* Abstract Pattern */}
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
  abstractPattern: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#6E44FF',
    opacity: 0.05,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  mainContent: { 
    flex: 1, 
    padding: 20,
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
    color: "#666", 
    marginTop: 50,
  },
  
  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 20, 
    color: "#2D3436",
    textAlign: "center",
  },
  
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profilePic: { 
    width: 80, 
    height: 80, 
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileInfo: { 
    marginLeft: 15,
    flex: 1,
  },
  name: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subText: { 
    fontSize: 14, 
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  offlineBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  
  infoCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    width: 20,
    height: 20,
    tintColor: '#6E44FF',
  },
  infoLabel: { 
    fontSize: 15, 
    color: "#2D3436",
    flex: 1,
  },
  
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  switchLabel: { 
    fontSize: 16, 
    fontWeight: "600",
    color: "#2D3436",
  },
  
  // Rides Tab Styles
  rideCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rideDate: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  starIcon: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
    marginRight: 4,
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  rideDetails: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
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
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#E8E6FF",
    marginVertical: 8,
    marginLeft: 4,
  },
  rideFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rideStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    width: 14,
    height: 14,
    tintColor: '#666',
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: "#666",
  },
  fareContainer: {
    backgroundColor: "#6E44FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fareText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  
  // Status Tab Styles
  statusCard: {
    padding: 24,
    borderRadius: 16,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 12,
  },
  statusIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  
  // Bottom Navigation
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#E8E6FF",
    zIndex: 1,
  },
  tabButton: {
    alignItems: "center",
  },
  tabIcon: {
    width: 24,
    height: 24,
    tintColor: '#666',
    marginBottom: 4,
  },
  activeTabIcon: {
    tintColor: '#6E44FF',
  },
  tabLabel: {
    fontSize: 12,
    color: "#666",
  },
  activeTabLabel: {
    color: "#6E44FF",
    fontWeight: "600",
  },
});