import React, { useState, useEffect, useRef } from "react";
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
  BackHandler,
  Linking,
  Animated,
  Dimensions,
  TextInput,
  AppState,
  NativeModules,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, Polyline } from "react-native-maps";
import Icon from '@react-native-vector-icons/material-icons';
import OTPDisplay from './OTPDisplay';
import OTPInput from './OTPInput';
import { disconnectRealtimeSocket, getRealtimeSocket } from "../services/realtime";

const { width, height } = Dimensions.get('window');
const API_BASE_URL = "https://soberfolks-backend.onrender.com";
const LOCATION_UPLOAD_INTERVAL_MS = 10000;
const { DriverLocationService } = NativeModules;
const DEFAULT_REGION = {
  latitude: 19.0760,
  longitude: 72.8777,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const DriverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState("profile");
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [pollingInterval, setPollingInterval] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pickupOTP, setPickupOTP] = useState<string>('');
  const [dropOTPInput, setDropOTPInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpLocked, setOtpLocked] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  const [selectedNavigation, setSelectedNavigation] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [isRouteFetching, setIsRouteFetching] = useState(false);

  const pendingRidePollingRef = useRef<any>(null);
  const activeRidePollingRef = useRef<any>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const locationUploadIntervalRef = useRef<any>(null);
  const latestTrackedPositionRef = useRef<any>(null);
  const lastLocationUploadAtRef = useRef(0);
  const locationUploadInFlightRef = useRef(false);
  const nativeLocationServiceRunningRef = useRef(false);
  const realtimeSocketRef = useRef<any>(null);
  const joinedRideRoomRef = useRef<number | null>(null);
  const activeRideRef = useRef<any>(null);
  const driverIdRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const chatListRef = useRef<any>(null);
  const lastAlertedRideIdRef = useRef<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!chatMessages.length) {
      return;
    }

    const timer = setTimeout(() => {
      chatListRef.current?.scrollToEnd?.({ animated: true });
    }, 60);

    return () => clearTimeout(timer);
  }, [chatMessages.length]);

  const appendIncomingMessage = (message: any) => {
    if (!message) {
      return;
    }

    setChatMessages((prev) => {
      const alreadyExists = prev.some((item) => {
        if (message.id && item.id) {
          return Number(item.id) === Number(message.id);
        }

        if (message.clientMessageId && item.clientMessageId) {
          return String(item.clientMessageId) === String(message.clientMessageId);
        }

        return false;
      });

      if (alreadyExists) {
        return prev;
      }

      return [...prev, message];
    });
  };

  const fetchRideMessages = async (rideId: number) => {
    if (!rideId) {
      return;
    }

    try {
      setChatLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/chat/rides/${rideId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setChatMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch (error) {
      console.error("Failed to fetch ride chat:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    const rideId = activeRideRef.current?.id;
    const body = chatInput.trim();

    if (!rideId || !body || chatSending) {
      return;
    }

    setChatSending(true);

    const socket = realtimeSocketRef.current;
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      if (socket?.connected) {
        const ack = await new Promise<any>((resolve) => {
          let settled = false;
          const timeoutId = setTimeout(() => {
            if (settled) {
              return;
            }

            settled = true;
            resolve(null);
          }, 5000);

          socket.emit(
            "chat:send",
            { rideId, body, messageType: "text", clientMessageId },
            (responseAck: any) => {
              if (settled) {
                return;
              }

              settled = true;
              clearTimeout(timeoutId);
              resolve(responseAck || null);
            }
          );
        });

        if (ack?.success && ack.message) {
          appendIncomingMessage(ack.message);
          setChatInput("");
          return;
        }
      }

      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/chat/rides/${rideId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body, messageType: "text", clientMessageId }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.message) {
        appendIncomingMessage(data.message);
        setChatInput("");
      } else {
        Alert.alert("Message Not Sent", data.error || "Please try again.");
      }
    } catch (error) {
      console.error("Failed to send chat message:", error);
      Alert.alert("Message Not Sent", "Network error occurred while sending your message.");
    } finally {
      setChatSending(false);
    }
  };

  const getMessageTime = (message: any) => {
    const raw = message?.createdAt || message?.created_at;
    if (!raw) {
      return "";
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchRoute = async (origin: string, destination: string) => {
    if (!origin || !destination) {
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
        body: JSON.stringify({ origin, destination }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setRouteCoordinates(data.route.coordinates);
        setRouteInfo({
          distance: data.route.distance,
          duration: data.route.duration,
        });

        const allCoords = [data.route.startLocation, ...data.route.coordinates, data.route.endLocation].filter(Boolean);
        if (allCoords.length > 0) {
          const latitudes = allCoords.map((coord) => coord.latitude || coord.lat);
          const longitudes = allCoords.map((coord) => coord.longitude || coord.lng);

          const minLat = Math.min(...latitudes);
          const maxLat = Math.max(...latitudes);
          const minLng = Math.min(...longitudes);
          const maxLng = Math.max(...longitudes);

          setMapRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
            longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
          });
        }
      } else {
        setRouteCoordinates([]);
        setRouteInfo(null);
      }
    } catch (error) {
      console.error("Driver route fetch error:", error);
      setRouteCoordinates([]);
      setRouteInfo(null);
    } finally {
      setIsRouteFetching(false);
    }
  };

  const callPhoneNumber = (phone?: string) => {
    const digits = String(phone || "").replace(/[^\d+]/g, "");
    if (!digits) {
      Alert.alert("Call Unavailable", "Consumer phone number is not available.");
      return;
    }

    const url = `tel:${digits}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Call Error", "Your device cannot open the phone dialer.");
          return;
        }

        return Linking.openURL(url);
      })
      .catch(() => {
        Alert.alert("Call Error", "Unable to open the phone dialer.");
      });
  };

  const isDriverRideActive = (ride: any) =>
    !!ride && (ride.status === 'accepted' || ride.status === 'in_progress');

  const stopLocationTracking = () => {
    if (locationWatchIdRef.current !== null) {
      Geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    if (locationUploadIntervalRef.current) {
      clearInterval(locationUploadIntervalRef.current);
      locationUploadIntervalRef.current = null;
    }
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS !== "android" || Platform.Version < 33) {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn("Notification permission request failed:", error);
      return false;
    }
  };

  const startNativeLocationService = async () => {
    if (Platform.OS !== "android" || nativeLocationServiceRunningRef.current) {
      return;
    }

    if (!DriverLocationService?.startTracking) {
      console.warn("Driver native location service is not available.");
      return;
    }

    const hasLocationPermission = await requestLocationPermission();
    if (!hasLocationPermission) {
      return;
    }

    await requestNotificationPermission();

    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      return;
    }

    try {
      await DriverLocationService.startTracking(token, API_BASE_URL);
      nativeLocationServiceRunningRef.current = true;
    } catch (error) {
      console.warn("Failed to start background driver tracking:", error);
    }
  };

  const stopNativeLocationService = async () => {
    if (Platform.OS !== "android" || !nativeLocationServiceRunningRef.current) {
      return;
    }

    try {
      await DriverLocationService?.stopTracking?.();
    } catch (error) {
      console.warn("Failed to stop background driver tracking:", error);
    } finally {
      nativeLocationServiceRunningRef.current = false;
    }
  };

  const uploadDriverLocation = async (coords: any, force = false) => {
    if (!coords?.latitude || !coords?.longitude) {
      return false;
    }

    const now = Date.now();
    if (!force && now - lastLocationUploadAtRef.current < LOCATION_UPLOAD_INTERVAL_MS - 1000) {
      return false;
    }

    if (locationUploadInFlightRef.current) {
      return false;
    }

    locationUploadInFlightRef.current = true;

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/location/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setCurrentLocation(data.location);
        latestTrackedPositionRef.current = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        };
        lastLocationUploadAtRef.current = now;
        return true;
      }
    } catch (err) {
      console.error("Location update error:", err);
    } finally {
      locationUploadInFlightRef.current = false;
    }

    return false;
  };

  const startLocationTracking = async () => {
    if (locationWatchIdRef.current !== null) {
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return;
    }

    locationWatchIdRef.current = Geolocation.watchPosition(
      (position) => {
        if (!position?.coords?.latitude || !position?.coords?.longitude) {
          return;
        }

        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        latestTrackedPositionRef.current = coords;
        uploadDriverLocation(coords).catch((error) => {
          console.error("Driver live location sync failed:", error);
        });
      },
      (error) => {
        console.warn("Driver location watch error:", error);
      },
      {
        enableHighAccuracy: true,
        interval: LOCATION_UPLOAD_INTERVAL_MS,
        fastestInterval: 5000,
        distanceFilter: 0,
        useSignificantChanges: false,
      }
    );

    locationUploadIntervalRef.current = setInterval(() => {
      const coords = latestTrackedPositionRef.current;
      if (!coords) {
        return;
      }

      uploadDriverLocation(coords, true).catch((error) => {
        console.error("Driver periodic location upload failed:", error);
      });
    }, LOCATION_UPLOAD_INTERVAL_MS);
  };

  const leaveRideRoom = () => {
    const socket = realtimeSocketRef.current;
    if (!socket || !joinedRideRoomRef.current) {
      return;
    }

    socket.emit("ride:leave", { rideId: joinedRideRoomRef.current });
    joinedRideRoomRef.current = null;
  };

  const joinRideRoom = (rideId: number) => {
    const socket = realtimeSocketRef.current;
    if (!socket) {
      return;
    }

    if (joinedRideRoomRef.current && joinedRideRoomRef.current !== rideId) {
      socket.emit("ride:leave", { rideId: joinedRideRoomRef.current });
      joinedRideRoomRef.current = null;
    }

    if (joinedRideRoomRef.current === rideId) {
      return;
    }

    socket.emit("ride:join", { rideId }, (ack: any) => {
      if (ack?.success) {
        joinedRideRoomRef.current = rideId;
      }
    });
  };

  const syncRealtimeRideState = async () => {
    const currentRide = activeRideRef.current;

    if (currentRide?.id && isDriverRideActive(currentRide)) {
      joinRideRoom(currentRide.id);
      await fetchActiveRide();
      await fetchRideMessages(currentRide.id);
    } else {
      await fetchActiveRide();
    }

    if (driverIdRef.current) {
      await fetchPendingRides();
    }
  };

  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  useEffect(() => {
    driverIdRef.current = driver?.id ?? null;
  }, [driver?.id]);

  useEffect(() => {
    let mounted = true;
    let socket: any;

    const setupRealtime = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (!token || !mounted) {
          return;
        }

        socket = getRealtimeSocket(token);
        realtimeSocketRef.current = socket;

        const onStageChanged = (event: any = {}) => {
          const rideId = Number(event.rideId);
          if (!rideId) {
            return;
          }

          const currentRide = activeRideRef.current;
          const currentDriverId = driverIdRef.current;

          if (currentRide?.id === rideId) {
            if (event.status) {
              setActiveRide((prev: any) =>
                prev && prev.id === rideId ? { ...prev, status: event.status } : prev
              );
            }

            fetchActiveRide();
            if (event.status === "completed" || event.status === "cancelled") {
              fetchRideHistory();
            }
          }

          if (currentDriverId && Number(event.driverId) === Number(currentDriverId)) {
            setActiveTab("status");
            fetchActiveRide();
          }
        };

        const onConnectError = (error: any) => {
          console.warn("Driver realtime connection issue:", error?.message || error);
        };

        const onConnect = () => {
          syncRealtimeRideState().catch((error) => {
            console.warn("Driver realtime resync failed:", error);
          });
        };

        const onChatMessage = (event: any = {}) => {
          const rideId = Number(event.rideId);
          if (!rideId || activeRideRef.current?.id !== rideId) {
            return;
          }

          appendIncomingMessage(event);
        };

        socket.on("ride:stage-changed", onStageChanged);
        socket.on("chat:message", onChatMessage);
        socket.on("connect", onConnect);
        socket.on("connect_error", onConnectError);
      } catch (error) {
        console.warn("Driver realtime setup failed:", error);
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      leaveRideRoom();
      if (socket) {
        socket.off("ride:stage-changed");
        socket.off("chat:message");
        socket.off("connect");
        socket.off("connect_error");
      }
      disconnectRealtimeSocket();
      realtimeSocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasBackgrounded = /inactive|background/.test(appStateRef.current);
      appStateRef.current = nextAppState;

      const shouldTrackLocation =
        nextAppState === "active" &&
        (Boolean(driver?.isAvailable) || isDriverRideActive(activeRideRef.current));

      if (shouldTrackLocation) {
        startLocationTracking().catch((error) => {
          console.warn("Driver foreground tracking restart failed:", error);
        });
      } else {
        stopLocationTracking();
      }

      if (wasBackgrounded && nextAppState === "active") {
        syncRealtimeRideState().catch((error) => {
          console.warn("Driver foreground resync failed:", error);
        });
      }
    });

    return () => subscription.remove();
  }, [driver?.isAvailable]);

  useEffect(() => {
    if (activeRide?.id && isDriverRideActive(activeRide)) {
      joinRideRoom(activeRide.id);
      fetchRideMessages(activeRide.id);
      return;
    }

    leaveRideRoom();
    setChatMessages([]);
    setChatInput("");
  }, [activeRide?.id, activeRide?.status]);

  const fetchRideHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/rides/history?page=1&limit=20`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok && data.rides) {
        setRecentRides(data.rides);
      }
    } catch (error) {
      console.error("Failed to fetch ride history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle Android Back Button
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              await stopNativeLocationService();
              stopLocationTracking();
              await AsyncStorage.removeItem("authToken");
              await AsyncStorage.removeItem("currentUser");
              await AsyncStorage.removeItem("userRole");
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            }
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [navigation]);

  // Request Location Permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION]); return granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
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
        position = await tryGetLocation(false, 10000);
      } catch (networkError) {
        position = await tryGetLocation(true, 30000);
      }

      if (position?.coords?.latitude && position?.coords?.longitude) {
        const { latitude, longitude } = position.coords;
        latestTrackedPositionRef.current = { latitude, longitude };
        await uploadDriverLocation({ latitude, longitude }, true);
      }
    } catch (error: any) {
      let errorMessage = "Could not fetch current location. ";
      switch (error.code) {
        case 1: errorMessage += "Location access denied."; break;
        case 2: errorMessage += "Location unavailable."; break;
        case 3: errorMessage += "Location request timed out."; break;
        default: errorMessage += "Unknown error.";
      }
      Alert.alert("Location Error", errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  // Fetch Stored Location
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
        if (data?.latitude && data?.longitude) {
          latestTrackedPositionRef.current = {
            latitude: data.latitude,
            longitude: data.longitude,
          };
        }
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

      const response = await fetch(`${API_BASE_URL}/api/rides/driver/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setDriver(data);
      } else {
        if (response.status === 403 || response.status === 401) {
          await AsyncStorage.removeItem("authToken");
          await AsyncStorage.removeItem("currentUser");
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchStoredLocation();
    fetchActiveRide();
    fetchRideHistory();
    return () => {
      if (pendingRidePollingRef.current) clearInterval(pendingRidePollingRef.current);
      if (activeRidePollingRef.current) clearInterval(activeRidePollingRef.current);
      stopLocationTracking();
      stopNativeLocationService();
    };
  }, []);

  useEffect(() => {
    if (driver?.isAvailable && !currentLocation) getCurrentLocation();
  }, [driver?.isAvailable]);

  useEffect(() => {
    // Prefer "lat,lng" coords for Google Directions — address strings can be
    // null or an auto-generated fallback like "Location (19.07, 72.87)" which
    // the Directions API may fail to geocode.
    const origin =
      currentLocation?.latitude && currentLocation?.longitude
        ? `${currentLocation.latitude},${currentLocation.longitude}`
        : currentLocation?.address || null;

    const destination =
      activeRide?.status === "in_progress"
        ? activeRide?.drop?.latitude && activeRide?.drop?.longitude
          ? `${activeRide.drop.latitude},${activeRide.drop.longitude}`
          : activeRide?.drop?.address || null
        : activeRide?.status === "accepted"
          ? activeRide?.pickup?.latitude && activeRide?.pickup?.longitude
            ? `${activeRide.pickup.latitude},${activeRide.pickup.longitude}`
            : activeRide?.pickup?.address || null
          : null;

    if (origin && destination) {
      fetchRoute(origin, destination);
    } else {
      setRouteCoordinates([]);
      setRouteInfo(null);
    }
  }, [activeRide?.id, activeRide?.status, currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    const shouldTrackLocation =
      appStateRef.current === "active" &&
      (Boolean(driver?.isAvailable) || isDriverRideActive(activeRide));

    if (shouldTrackLocation) {
      startLocationTracking().catch((error) => {
        console.warn("Failed to start driver location tracking:", error);
      });
      return;
    }

    stopLocationTracking();
  }, [driver?.isAvailable, activeRide?.id, activeRide?.status]);

  useEffect(() => {
    if (isDriverRideActive(activeRide)) {
      startNativeLocationService();
      return;
    }

    stopNativeLocationService();
  }, [activeRide?.id, activeRide?.status]);

  // Fetch pending rides
  const fetchPendingRides = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/rides/driver/pending-rides`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPendingRides(data.pendingRides);

        const firstRideId = data.pendingRides.length > 0 ? data.pendingRides[0].rideId : null;
        if (firstRideId && lastAlertedRideIdRef.current !== firstRideId) {
          lastAlertedRideIdRef.current = firstRideId;
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
          Alert.alert(
            "🚗 New Ride Request!",
            `Pickup: ${data.pendingRides[0].pickupAddress}\nDrop: ${data.pendingRides[0].dropAddress}\nFare: ₹${data.pendingRides[0].fare}`,
            [{ text: "View", onPress: () => setActiveTab("status") }]
          );
        } else if (!firstRideId) {
          lastAlertedRideIdRef.current = null;
        }
      }
    } catch (error) {
      console.error("Fetch pending rides error:", error);
    }
  };

  // Start polling when driver is available
  useEffect(() => {
    if (driver?.isAvailable) {
      const interval = setInterval(fetchPendingRides, 5000);
      pendingRidePollingRef.current = interval;
      setPollingInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (pendingRidePollingRef.current) clearInterval(pendingRidePollingRef.current);
      setPollingInterval(null);
      setPendingRides([]);
      lastAlertedRideIdRef.current = null;
    }
  }, [driver?.isAvailable]);

  // Accept ride function
  const handleAcceptRide = async (rideId: number) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        try {
          const otpResponse = await fetch(`${API_BASE_URL}/api/otp/rides/${rideId}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const otpData = await otpResponse.json();

          if (otpData.success && otpData.otpStatus?.pickup?.otp_code) {
            setPickupOTP(otpData.otpStatus.pickup.otp_code);
            Alert.alert(
              "Ride Accepted! ✅",
              `Pickup OTP: ${otpData.otpStatus.pickup.otp_code}\n\nShow this OTP to the consumer at pickup.`,
              [{ text: "OK" }]
            );
          }
        } catch (err) {
          Alert.alert("Ride Accepted! ✅", "OTP will be available shortly.");
        }
        setPendingRides([]);
        fetchActiveRide();
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
      const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to reject ride");
        return;
      }
      setPendingRides([]);
      await fetchPendingRides();
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
    }
  };

  // Fetch active ride
  const fetchActiveRide = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/rides/active`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success && data.ride && isDriverRideActive(data.ride)) {
        setActiveRide(data.ride);
        if (activeTab !== 'status') setActiveTab('status');

        if (data.ride.status === 'accepted') {
          try {
            const otpResponse = await fetch(`${API_BASE_URL}/api/otp/rides/${data.ride.id}/status`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const otpData = await otpResponse.json();
            if (otpData.success && otpData.otpStatus?.pickup?.otp_code) {
              setPickupOTP(otpData.otpStatus.pickup.otp_code);
            }
          } catch (err) {
            console.error('Failed to fetch pickup OTP:', err);
          }
        }
      } else {
        if (activeRide) await fetchRideHistory();
        setPickupOTP('');
        setDropOTPInput('');
        setOtpError('');
        setOtpAttempts(0);
        setOtpLocked(false);
        setActiveRide(null);
        if (activeTab === 'status' && pendingRides.length === 0) setActiveTab('profile');
      }
    } catch (error) {
      console.error("Failed to fetch active ride:", error);
    }
  };

  // Poll active ride every 10 seconds
  useEffect(() => {
    const pollInterval = setInterval(fetchActiveRide, 10000);
    activeRidePollingRef.current = pollInterval;
    return () => clearInterval(pollInterval);
  }, []);

  // Reset OTP state on ride status change
  useEffect(() => {
    if (activeRide) {
      if (activeRide.status === 'accepted') {
        setOtpAttempts(0);
        setOtpLocked(false);
        setOtpError('');
      } else if (activeRide.status === 'in_progress') {
        setOtpAttempts(0);
        setOtpLocked(false);
        setOtpError('');
      }
    } else {
      setPickupOTP('');
      setDropOTPInput('');
      setOtpAttempts(0);
      setOtpLocked(false);
      setOtpError('');
    }
  }, [activeRide?.id, activeRide?.status]);

  // Google Maps Navigation Functions
  const openGoogleMapsRoute = (points: Array<{ latitude: number; longitude: number }>) => {
    const validPoints = points.filter((point) => point?.latitude && point?.longitude);
    if (validPoints.length < 2) {
      Alert.alert('Navigation Error', 'Route coordinates are not available yet.');
      return;
    }

    const path = validPoints
      .map((point) => `${point.latitude},${point.longitude}`)
      .join("/");
    const googleMapsUrl = `https://www.google.com/maps/dir/${path}`;
    const mapsUrl = `maps://maps.google.com/maps/dir/${path}`;

    Linking.openURL(googleMapsUrl)
      .catch(() => Linking.openURL(mapsUrl))
      .catch(() => {
        Alert.alert('Navigation Error', 'Unable to open maps. Please open Google Maps manually.');
      });
  };

  const openGoogleMapsNavigation = (driverLat: number, driverLon: number, customerLat: number, customerLon: number) => {
    const destination = activeRideRef.current?.drop || { latitude: customerLat, longitude: customerLon };
    openGoogleMapsRoute([
      { latitude: driverLat, longitude: driverLon },
      destination,
    ]);
  };

  const getCurrentDriverLocation = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/location/current`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok && data.latitude && data.longitude) {
        return { latitude: data.latitude, longitude: data.longitude };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleStartRide = async (rideId: number) => {
    if (activeRide && activeRide.pickup) {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/start`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const driverLocation = await getCurrentDriverLocation();
          if (driverLocation) {
            openGoogleMapsNavigation(
              driverLocation.latitude,
              driverLocation.longitude,
              activeRide.pickup.latitude,
              activeRide.pickup.longitude
            );
            Alert.alert("🚗 Navigation Started!", "Google Maps opened with directions to your customer.");
          }
          fetchActiveRide();
        } else {
          Alert.alert("Error", "Failed to start ride");
        }
      } catch (error) {
        Alert.alert("Error", "Network error occurred");
      }
    }
  };

  const handleNavigateToPickup = async () => {
    if (!activeRide?.pickup) {
      Alert.alert("Navigation Error", "Pickup location is not available.");
      return;
    }

    const driverLocation = await getCurrentDriverLocation();
    const origin = driverLocation || currentLocation;
    if (!origin) {
      Alert.alert("Navigation Error", "Driver location is not available yet.");
      return;
    }

    openGoogleMapsRoute([origin, activeRide.pickup]);
  };

  const handleNavigateToDrop = async () => {
    if (!activeRide?.drop) {
      Alert.alert("Navigation Error", "Drop location is not available.");
      return;
    }

    const driverLocation = await getCurrentDriverLocation();
    const origin = driverLocation || activeRide.pickup;
    openGoogleMapsRoute([origin, activeRide.drop]);
  };

  const handleCancelAcceptedRide = async (rideId: number) => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this accepted ride?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("authToken");
              const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/cancel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                setPickupOTP('');
                setDropOTPInput('');
                setOtpError('');
                setOtpAttempts(0);
                setOtpLocked(false);
                setActiveRide(null);
                await fetchPendingRides();
                await fetchActiveRide();
                Alert.alert("Ride Cancelled", "The accepted ride has been cancelled.");
              }
            } catch (error) {
              Alert.alert("Error", "Network error occurred");
            }
          }
        }
      ]
    );
  };

  const handleVerifyDropOTP = async (otp: string) => {
    if (!activeRide) return;
    if (otpLocked || otpAttempts >= 5) {
      Alert.alert("OTP Locked", "Maximum verification attempts exceeded.");
      return;
    }

    setOtpVerifying(true);
    setOtpError('');

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/otp/rides/${activeRide.id}/verify-drop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpError('');
        setOtpAttempts(0);
        setOtpLocked(false);
        Alert.alert("OTP Verified! ✅", "Drop OTP verified. Completing ride...");
        handleCompleteRide(activeRide.id);
      } else {
        if (response.status === 429 || data.rideStatus === 'completed') {
          setOtpLocked(true);
          setOtpError(data.error || "Maximum attempts exceeded. Ride has been auto-completed.");
          Alert.alert(
            "Ride Auto-completed",
            data.error || "Maximum drop OTP attempts were exceeded. The ride has been auto-completed for safety.",
            [{ text: "OK", onPress: () => fetchActiveRide() }]
          );
          return;
        }

        const newAttempts = typeof data.attemptsRemaining === "number"
          ? 5 - data.attemptsRemaining
          : otpAttempts + 1;
        setOtpAttempts(newAttempts);

        if (typeof data.attemptsRemaining === "number") {
          setOtpError(`Invalid OTP. ${data.attemptsRemaining} attempts remaining.`);
        } else {
          setOtpError(`Invalid OTP. ${5 - newAttempts} attempts remaining.`);
        }
      }
    } catch (error) {
      setOtpError("Network error occurred");
    } finally {
      setOtpVerifying(false);
    }
  };

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
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                setPickupOTP('');
                setDropOTPInput('');
                setOtpError('');
                Alert.alert("Ride Completed! ✅");
                setActiveRide(null);
                await fetchActiveRide();
                await fetchRideHistory();
              } else {
                Alert.alert("Error", "Failed to complete ride");
              }
            } catch (error) {
              Alert.alert("Error", "Network error occurred");
            }
          },
        },
      ]
    );
  };

  // Toggle Availability
  const toggleAvailability = async (value: boolean) => {
    if (!driver) return;
    setAvailabilityLoading(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/profile/${driver.id}/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: value }),
      });

      const data = await response.json();
      if (response.ok) {
        setDriver({ ...driver, isAvailable: data.isAvailable });
        if (value) getCurrentLocation();
      } else {
        Alert.alert("Error", data.error || "Failed to update availability");
      }
    } catch (err) {
      Alert.alert("Error", "Network error occurred");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const hasActiveRide = isDriverRideActive(activeRide);

  // Render profile tab
  const renderProfileTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileHeader}
      >
        <Image
          source={{ uri: driver?.profilePhoto || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
          style={styles.profilePic}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{driver?.fullName}</Text>
          <Text style={styles.subText}>Professional Driver • {driver?.scooterModel || "Electric Scooter"}</Text>
          <View style={[styles.statusBadge, driver?.isAvailable ? styles.availableBadge : styles.offlineBadge]}>
            <Text style={styles.statusText}>{driver?.isAvailable ? "Available" : "Offline"}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Icon name="star" size={24} color="#FFB800" />
          <Text style={styles.statNumber}>4.8</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="check-circle" size={24} color="#10b981" />
          <Text style={styles.statNumber}>{recentRides.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="schedule" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      {/* Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.cardHeader}>
          <Icon name="location-on" size={24} color="#667eea" />
          <Text style={styles.cardTitle}>Current Location</Text>
          <TouchableOpacity onPress={getCurrentLocation} disabled={locationLoading} style={styles.refreshBtn}>
            <Icon name="refresh" size={20} color="#667eea" />
          </TouchableOpacity>
        </View>

        {currentLocation ? (
          <View>
            <Text style={styles.locationAddress}>{currentLocation.address || "Unknown Location"}</Text>
            <View style={styles.coordRow}>
              <Text style={styles.coordText}>Lat: {currentLocation.latitude?.toFixed(6) || "N/A"}</Text>
              <Text style={styles.coordText}>Lng: {currentLocation.longitude?.toFixed(6) || "N/A"}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.enableLocationBtn} onPress={getCurrentLocation}>
            <Icon name="gps-fixed" size={24} color="#667eea" />
            <Text style={styles.enableLocationText}>Enable Location Tracking</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Icon name="email" size={20} color="#667eea" />
          <Text style={styles.infoText}>{driver?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#667eea" />
          <Text style={styles.infoText}>{driver?.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="person" size={20} color="#667eea" />
          <Text style={styles.infoText}>Gender: {driver?.gender}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="cake" size={20} color="#667eea" />
          <Text style={styles.infoText}>DOB: {driver?.dateOfBirth}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="home" size={20} color="#667eea" />
          <Text style={styles.infoText}>{driver?.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="credit-card" size={20} color="#667eea" />
          <Text style={styles.infoText}>Aadhar: {driver?.aadharNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="assignment" size={20} color="#667eea" />
          <Text style={styles.infoText}>License: {driver?.licenseNumber}</Text>
        </View>
      </View>

      {/* Availability Switch */}
      <View style={styles.switchCard}>
        <View>
          <Text style={styles.switchLabel}>Available for Service</Text>
          <Text style={styles.switchSubtext}>
            {driver?.isAvailable ? "You'll receive ride requests" : "You won't receive ride requests"}
          </Text>
        </View>
        <Switch
          value={driver?.isAvailable}
          onValueChange={toggleAvailability}
          trackColor={{ false: "#767577", true: "#667eea" }}
          thumbColor={driver?.isAvailable ? "#fff" : "#f4f3f4"}
          disabled={availabilityLoading}
        />
      </View>
    </ScrollView>
  );

  // Render rides tab
  const renderRidesTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.sectionTitle}>Recent Rides</Text>

      {isLoadingHistory ? (
        <ActivityIndicator size="large" color="#667eea" style={styles.loader} />
      ) : recentRides.length === 0 ? (
        <View style={styles.emptyState}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyIconContainer}>
            <Icon name="history" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySubtext}>Your completed rides will appear here</Text>
        </View>
      ) : (
        recentRides.map((ride) => (
          <View key={ride.id} style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <Text style={styles.rideDate}>
                {new Date(ride.createdAt).toLocaleDateString()}
              </Text>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>COMPLETED</Text>
              </View>
            </View>

            <View style={styles.rideLocations}>
              <View style={styles.locationItem}>
                <View style={[styles.locationDot, styles.pickupDot]} />
                <Text style={styles.locationAddressText}>{ride.pickup.address}</Text>
              </View>
              <View style={styles.locationItem}>
                <View style={[styles.locationDot, styles.dropDot]} />
                <Text style={styles.locationAddressText}>{ride.drop.address}</Text>
              </View>
            </View>

            <View style={styles.rideFooter}>
              <View style={styles.rideStat}>
                <Icon name="directions-car" size={16} color="#667eea" />
                <Text style={styles.rideStatText}>{ride.distance} km</Text>
              </View>
              <View style={styles.fareBadge}>
                <Text style={styles.fareText}>₹{ride.fare}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  // Render status tab
  const renderStatusTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Active Ride Section */}
      {hasActiveRide && (
        <Animated.View style={[styles.activeRideSection, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={activeRide.status === 'accepted' ? ['#f59e0b', '#d97706'] : ['#10b981', '#059669']}
            style={styles.activeRideCard}
          >
            <Text style={styles.activeRideTitle}>
              {activeRide.status === 'accepted' ? '🚗 On the way to pickup' : '🛣️ Trip in Progress'}
            </Text>

            <View style={styles.activeRideDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Consumer:</Text>
                <Text style={styles.detailValue}>{activeRide.consumer?.name || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{activeRide.consumer?.phone || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup:</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{activeRide.pickup.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Drop:</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{activeRide.drop.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fare:</Text>
                <Text style={styles.activeRideFare}>₹{activeRide.fare}</Text>
              </View>
            </View>

            <View style={styles.routeMapCard}>
              <View style={styles.routeMapHeader}>
                <Text style={styles.routeMapTitle}>
                  {activeRide.status === 'accepted' ? 'Route to Pickup' : 'Route to Destination'}
                </Text>
                {routeInfo && (
                  <Text style={styles.routeMapMeta}>{routeInfo.distance} • {routeInfo.duration}</Text>
                )}
              </View>

              <MapView
                style={styles.routeMap}
                region={mapRegion}
                showsUserLocation={false}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                loadingEnabled
              >
                {currentLocation?.latitude && currentLocation?.longitude && (
                  <Marker
                    coordinate={{
                      latitude: Number(currentLocation.latitude),
                      longitude: Number(currentLocation.longitude),
                    }}
                    title="You"
                  />
                )}

                {activeRide?.pickup?.latitude && activeRide?.pickup?.longitude && (
                  <Marker coordinate={activeRide.pickup} title="Pickup" pinColor="#10b981" />
                )}

                {activeRide?.drop?.latitude && activeRide?.drop?.longitude && (
                  <Marker coordinate={activeRide.drop} title="Destination" pinColor="#ef4444" />
                )}

                {routeCoordinates.length > 0 && (
                  <Polyline coordinates={routeCoordinates} strokeColor="#667eea" strokeWidth={4} />
                )}
              </MapView>

              {isRouteFetching && (
                <Text style={styles.routeLoadingText}>Loading route...</Text>
              )}
            </View>

            {activeRide.status === 'accepted' && pickupOTP && (
              <OTPDisplay
                otp={pickupOTP}
                title="🔑 Pickup OTP"
                subtitle="Show this OTP to the consumer"
              />
            )}

            {activeRide.status === 'in_progress' && (
              <OTPInput
                title="🔐 Verify Drop OTP"
                subtitle="Enter the OTP shown by the consumer"
                onVerify={handleVerifyDropOTP}
                loading={otpVerifying}
                error={otpError}
                attempts={otpAttempts}
                maxAttempts={5}
              />
            )}

            <View style={styles.rideChatCard}>
              <Text style={styles.rideChatTitle}>Ride Chat</Text>
              <ScrollView
                ref={chatListRef}
                style={styles.rideChatList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : chatMessages.length === 0 ? (
                  <Text style={styles.rideChatEmptyText}>No messages yet. Start the conversation.</Text>
                ) : (
                  chatMessages.map((message, index) => {
                    const key = message.id || `${message.clientMessageId || "msg"}-${index}`;
                    const isOwn = Number(message.senderId || message.sender_id) === Number(driverIdRef.current);

                    return (
                      <View key={key} style={[styles.rideChatBubble, isOwn ? styles.rideChatBubbleOwn : styles.rideChatBubbleOther]}>
                        <Text style={styles.rideChatSender}>{isOwn ? 'You' : (message.senderRole || message.sender_role || 'Consumer')}</Text>
                        <Text style={styles.rideChatBubbleText}>{message.body}</Text>
                        <Text style={styles.rideChatMeta}>{getMessageTime(message)}</Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.rideChatInputRow}>
                <TextInput
                  style={styles.rideChatInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Message rider..."
                  placeholderTextColor="rgba(255,255,255,0.75)"
                />
                <TouchableOpacity
                  style={[styles.rideChatSendButton, (!chatInput.trim() || chatSending) && styles.rideChatSendButtonDisabled]}
                  onPress={sendChatMessage}
                  disabled={!chatInput.trim() || chatSending}
                >
                  {chatSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Icon name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.activeRideActions}>
              {activeRide.status === 'accepted' && (
                <>
                  <TouchableOpacity style={styles.navigateButton} onPress={handleNavigateToPickup}>
                    <Icon name="navigation" size={20} color="#fff" />
                    <Text style={styles.navigateButtonText}>Navigate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.navigateButton} onPress={() => handleStartRide(activeRide.id)}>
                    <Icon name="play-arrow" size={20} color="#fff" />
                    <Text style={styles.navigateButtonText}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelAcceptedRide(activeRide.id)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
              {activeRide.status === 'in_progress' && (
                <TouchableOpacity style={styles.navigateButton} onPress={handleNavigateToDrop}>
                  <Icon name="navigation" size={20} color="#fff" />
                  <Text style={styles.navigateButtonText}>Destination</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => {
                  const consumerPhone = activeRide.consumer?.phone;
                  Alert.alert(
                    "Call Consumer",
                    `Would you like to call ${activeRide.consumer?.name || "the consumer"}?\n${consumerPhone || "Phone number unavailable"}`,
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Call", onPress: () => callPhoneNumber(consumerPhone) },
                    ]
                  );
                }}
              >
                <Icon name="call" size={20} color="#fff" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Pending Rides */}
      {pendingRides.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>🔔 New Ride Request</Text>
          {pendingRides.map((ride) => (
            <LinearGradient
              key={ride.rideId}
              colors={['#f97316', '#ef4444']}
              style={styles.pendingCard}
            >
              <View style={styles.pendingLocation}>
                <Icon name="location-on" size={20} color="#fff" />
                <Text style={styles.pendingLabel}>Pickup</Text>
                <Text style={styles.pendingValue}>{ride.pickupAddress}</Text>
              </View>
              <View style={styles.pendingLocation}>
                <Icon name="flag" size={20} color="#fff" />
                <Text style={styles.pendingLabel}>Drop</Text>
                <Text style={styles.pendingValue}>{ride.dropAddress}</Text>
              </View>

              <View style={styles.pendingStats}>
                <View style={styles.pendingStat}>
                  <Text style={styles.pendingStatLabel}>Distance to pickup</Text>
                  <Text style={styles.pendingStatValue}>{ride.distanceToPickup} km</Text>
                </View>
                <View style={styles.pendingStat}>
                  <Text style={styles.pendingStatLabel}>Total distance</Text>
                  <Text style={styles.pendingStatValue}>{ride.totalDistance} km</Text>
                </View>
                <View style={styles.pendingStat}>
                  <Text style={styles.pendingStatLabel}>Fare</Text>
                  <Text style={styles.pendingStatValue}>₹{ride.fare}</Text>
                </View>
              </View>

              <View style={styles.pendingActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRide(ride.rideId)}>
                  <Icon name="check" size={20} color="#fff" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRide(ride.rideId)}>
                  <Icon name="close" size={20} color="#fff" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ))}
        </View>
      )}

      {/* Status Overview */}
      <LinearGradient
        colors={['#1f2937', '#111827']}
        style={styles.statusOverviewCard}
      >
        <Text style={styles.statusOverviewTitle}>Driver Status</Text>

        <View style={styles.statusOverviewItem}>
          <Icon name="notifications" size={24} color="#f59e0b" />
          <Text style={styles.statusOverviewText}>Pending Requests: {pendingRides.length}</Text>
        </View>

        <View style={styles.statusOverviewItem}>
          <Icon name="radio-button-checked" size={24} color={hasActiveRide ? "#f59e0b" : "#10b981"} />
          <Text style={styles.statusOverviewText}>
            Status: {hasActiveRide ? "Busy" : (driver?.isAvailable ? "Available" : "Offline")}
          </Text>
        </View>

        <View style={styles.statusOverviewItem}>
          <Icon name="directions-car" size={24} color="#667eea" />
          <Text style={styles.statusOverviewText}>Active Ride: {hasActiveRide ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.statusOverviewItem}>
          <Icon name="star" size={24} color="#FFB800" />
          <Text style={styles.statusOverviewText}>Rating: 4.8 ★</Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Background Elements */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
        <View style={styles.gridPattern} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SoberFolk Driver</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Logout",
              style: "destructive",
              onPress: async () => {
                await stopNativeLocationService();
                stopLocationTracking();
                await AsyncStorage.removeItem("authToken");
                await AsyncStorage.removeItem("currentUser");
                await AsyncStorage.removeItem("userRole");
                navigation.reset({ index: 0, routes: [{ name: "Login" }] });
              }
            }
          ]);
        }}>
          <Icon name="logout" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab("profile")}
          style={[styles.tab, activeTab === "profile" && styles.activeTab]}
        >
          <Icon name="person" size={24} color={activeTab === "profile" ? "#667eea" : "#64748b"} />
          <Text style={[styles.tabLabel, activeTab === "profile" && styles.activeTabLabel]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("rides")}
          style={[styles.tab, activeTab === "rides" && styles.activeTab]}
        >
          <Icon name="history" size={24} color={activeTab === "rides" ? "#667eea" : "#64748b"} />
          <Text style={[styles.tabLabel, activeTab === "rides" && styles.activeTabLabel]}>Rides</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("status")}
          style={[styles.tab, activeTab === "status" && styles.activeTab]}
        >
          <Icon name="gps-fixed" size={24} color={activeTab === "status" ? "#667eea" : "#64748b"} />
          <Text style={[styles.tabLabel, activeTab === "status" && styles.activeTabLabel]}>Status</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {activeTab === "profile" && renderProfileTab()}
        {activeTab === "rides" && renderRidesTab()}
        {activeTab === "status" && renderStatusTab()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.05,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.1,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#667eea',
    top: -150,
    right: -150,
    borderRadius: 200,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#764ba2',
    bottom: -100,
    left: -100,
    borderRadius: 150,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: '#f59e0b',
    top: '40%',
    right: -50,
    borderRadius: 100,
    opacity: 0.08,
  },
  gridPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.03,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#f1f5f9',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabLabel: {
    color: '#667eea',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  availableBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  offlineBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  refreshBtn: {
    padding: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 12,
    lineHeight: 20,
  },
  coordRow: {
    flexDirection: 'row',
    gap: 16,
  },
  coordText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  enableLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderStyle: 'dashed',
    gap: 8,
  },
  enableLocationText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  switchSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideDate: {
    fontSize: 12,
    color: '#64748b',
  },
  completedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
  },
  rideLocations: {
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  pickupDot: {
    backgroundColor: '#667eea',
  },
  dropDot: {
    backgroundColor: '#f59e0b',
  },
  locationAddressText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rideStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rideStatText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  fareBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fareText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  activeRideSection: {
    marginBottom: 20,
  },
  activeRideCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  activeRideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  activeRideDetails: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  routeMapCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  routeMapHeader: {
    marginBottom: 10,
  },
  routeMapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  routeMapMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  routeMap: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  routeLoadingText: {
    marginTop: 8,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  detailValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  activeRideFare: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  rideChatCard: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  rideChatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  rideChatList: {
    maxHeight: 150,
    marginBottom: 10,
  },
  rideChatEmptyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingVertical: 8,
  },
  rideChatBubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  rideChatBubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  rideChatBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  rideChatSender: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  rideChatBubbleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  rideChatMeta: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    textAlign: 'right',
  },
  rideChatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rideChatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 12,
  },
  rideChatSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideChatSendButtonDisabled: {
    backgroundColor: 'rgba(148,163,184,0.75)',
  },
  activeRideActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigateButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  pendingCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  pendingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pendingLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginLeft: 4,
  },
  pendingValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  pendingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  pendingStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 8,
    marginHorizontal: 4,
  },
  pendingStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  pendingStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusOverviewCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  statusOverviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statusOverviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statusOverviewText: {
    fontSize: 14,
    color: '#fff',
  },
  loader: {
    marginTop: 40,
  },
});

export default DriverScreen;
