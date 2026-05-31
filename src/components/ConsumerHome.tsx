import React, { useState, useEffect, useRef } from "react";
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
  Animated,
  AppState,
  Linking,
  Modal,
  Switch,
  FlatList
} from "react-native";
import Contacts from 'react-native-contacts';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import MapView, { Marker, Polyline } from "react-native-maps";
import LinearGradient from "react-native-linear-gradient";
import Geolocation from '@react-native-community/geolocation';
import Icon from '@react-native-vector-icons/material-icons';
import OTPDisplay from './OTPDisplay';
import OTPInput from './OTPInput';
import { disconnectRealtimeSocket, getRealtimeSocket } from "../services/realtime";
import { processPayment } from "../services/payment";

const { width } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: 19.0760,
  longitude: 72.8777,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

import { API_BASE_URL } from "../config/api";

// Helper function to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const statusPollingIntervalRef = useRef<any>(null);
  const statusPollingTimeoutRef = useRef<any>(null);
  const activeRidePollingRef = useRef<any>(null);
  const realtimeSocketRef = useRef<any>(null);
  const joinedRideRoomRef = useRef<number | null>(null);
  const activeRideRef = useRef<any>(null);
  const currentRideRequestRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const acceptedAlertedRideRef = useRef<number | null>(null);
  const userIdRef = useRef<number | null>(null);
  const chatListRef = useRef<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isLoadingActiveRide, setIsLoadingActiveRide] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  // OTP states
  const [dropOTP, setDropOTP] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpLocked, setOtpLocked] = useState(false);
  const [showPickupOTPInput, setShowPickupOTPInput] = useState(false);

  // Payment states
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [paymentError, setPaymentError] = useState<string>('');
  const [completedRideForPayment, setCompletedRideForPayment] = useState<any>(null);


  // Safety contacts — pre-filled for next ride, passed to booking API
  const [safetyContacts, setSafetyContacts] = useState<{name: string; phone: string}[]>([]);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyContactInput, setSafetyContactInput] = useState('');
  const [safetyContactNameInput, setSafetyContactNameInput] = useState('');
  const [pendingBookingContacts, setPendingBookingContacts] = useState<{name: string; phone: string}[]>([]);
  // Recent rides state
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Book for someone else state
  const [isBookingForSomeoneElse, setIsBookingForSomeoneElse] = useState(false);
  const [passengerPhoneInput, setPassengerPhoneInput] = useState('');
  const [verifiedPassengerName, setVerifiedPassengerName] = useState<string | null>(null);
  const [passengerId, setPassengerId] = useState<number | null>(null);
  const [isVerifyingPassenger, setIsVerifyingPassenger] = useState(false);
  const [passengerVerifyError, setPassengerVerifyError] = useState('');

  // Contact Picker Modal
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [contactSearchText, setContactSearchText] = useState('');
  const [targetContactInput, setTargetContactInput] = useState<'passenger' | 'safety' | null>(null);
  const [isContactsLoading, setIsContactsLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    ]).start();
  }, []);

  const handleCancelActiveRide = async () => {
    if (!activeRide?.id) return;

    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("authToken");
              const response = await fetch(`${API_BASE_URL}/api/rides/${activeRide.id}/cancel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });

              const data = await response.json();
              if (!response.ok) {
                Alert.alert("Error", data.error || "Failed to cancel ride");
                return;
              }

              clearRideSearchPolling();
              clearActiveRidePolling();
              resetRideUiState();
              await fetchRideHistory();
              Alert.alert("Ride Cancelled", "Your ride has been cancelled.");
            } catch (error) {
              Alert.alert("Error", "Network error occurred while cancelling ride");
            }
          }
        }
      ]
    );
  };

  const clearRideSearchPolling = () => {
    if (statusPollingIntervalRef.current) {
      clearInterval(statusPollingIntervalRef.current);
      statusPollingIntervalRef.current = null;
    }
    if (statusPollingTimeoutRef.current) {
      clearTimeout(statusPollingTimeoutRef.current);
      statusPollingTimeoutRef.current = null;
    }
    setStatusPollingInterval(null);
  };

  const clearActiveRidePolling = () => {
    if (activeRidePollingRef.current) {
      clearInterval(activeRidePollingRef.current);
      activeRidePollingRef.current = null;
    }
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

  const resetRideUiState = () => {
    setActiveRide(null);
    setCurrentRideRequest(null);
    setDriverQueue([]);
    setIsBooking(false);
    setBookingStatus('');
    setPickupCoords(null);
    setDropCoords(null);
    setPickup("");
    setDrop("");
    setRouteCoordinates([]);
    setRouteInfo(null);
    setDropOTP('');
    setOtpError('');
    setOtpVerifying(false);
    setOtpAttempts(0);
    setOtpLocked(false);
    setShowPickupOTPInput(false);
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
    setChatSending(false);
    setIsBookingForSomeoneElse(false);
    setPassengerPhoneInput('');
    setVerifiedPassengerName(null);
    setPassengerId(null);
  };

  const buildPaymentRide = (ride: any) => {
    if (!ride) {
      return null;
    }

    return {
      ...ride,
      pickup_address: ride.pickup_address || ride.pickupAddress || ride.pickup?.address || pickup || 'Pickup Location',
      drop_address: ride.drop_address || ride.dropAddress || ride.drop?.address || drop || 'Drop Location',
      fare: ride.fare || ride.totalFare || ride.amount || 0,
      distance: ride.distance || routeInfo?.distance,
      duration: ride.duration || routeInfo?.duration,
    };
  };

  const showPaymentForRide = (ride: any) => {
    const paymentRide = buildPaymentRide(ride);
    if (!paymentRide?.id) {
      return;
    }

    clearRideSearchPolling();
    clearActiveRidePolling();
    setCompletedRideForPayment(paymentRide);
    setShowPaymentScreen(true);
    setPaymentStatus('pending');
    setPaymentError('');
    setPaymentLoading(false);
  };

  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  useEffect(() => {
    currentRideRequestRef.current = currentRideRequest;
  }, [currentRideRequest]);

  useEffect(() => {
    userIdRef.current = user?.id ? Number(user.id) : null;
  }, [user?.id]);

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

  const callPhoneNumber = async (phone?: string) => {
    const digits = String(phone || '').replace(/[^\d+]/g, '');
    if (!digits) {
      Alert.alert('Call Unavailable', 'Driver phone number is not available.');
      return;
    }

    // Request CALL_PHONE permission at runtime (required on Android 6+)
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          {
            title: 'Phone Call Permission',
            message: 'SoberFolk needs permission to call the driver directly.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Call permission was denied. Please enable it in Settings.');
          return;
        }
      } catch (err) {
        console.warn('CALL_PHONE permission error:', err);
      }
    }

    const url = `tel:${digits}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Call Error', 'Your device cannot open the phone dialer.');
          return;
        }
        return Linking.openURL(url);
      })
      .catch(() => {
        Alert.alert('Call Error', 'Unable to open the phone dialer.');
      });
  };

  const syncRealtimeRideState = async () => {
    const currentRide = activeRideRef.current;
    const currentRequest = currentRideRequestRef.current;

    if (currentRide?.id && (currentRide.status === "accepted" || currentRide.status === "in_progress")) {
      joinRideRoom(currentRide.id);
      await fetchActiveRide();
      await fetchRideMessages(currentRide.id);
      return;
    }

    if (currentRequest?.id) {
      await fetchActiveRide();
    }
  };

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
          const currentRequest = currentRideRequestRef.current;

          if (currentRide?.id === rideId) {
            if (event.status) {
              setActiveRide((prev: any) =>
                prev && prev.id === rideId ? { ...prev, status: event.status } : prev
              );
            }

            if (event.status === "completed") {
              showPaymentForRide({
                ...currentRide,
                status: "completed",
                ...(event.ride || {}),
              });
            } else if (event.status === "cancelled") {
              clearRideSearchPolling();
              clearActiveRidePolling();
              resetRideUiState();
              fetchRideHistory();
            } else {
              fetchActiveRide();
            }
            return;
          }

          if (currentRequest?.id === rideId && event.status === "accepted") {
            clearRideSearchPolling();
            setIsBooking(false);
            setBookingStatus('');
            setCurrentRideRequest(null);
            setDriverQueue([]);
            fetchActiveRide();

            if (acceptedAlertedRideRef.current !== rideId) {
              acceptedAlertedRideRef.current = rideId;
              Alert.alert("Ride Accepted! 🎉", "Your ride has been accepted! Driver is on the way.");
            }
          }
        };

        const onDriverLocation = (event: any = {}) => {
          const rideId = Number(event.rideId);
          if (!rideId || !event.location) {
            return;
          }

          setActiveRide((prev: any) => {
            if (!prev || prev.id !== rideId) {
              return prev;
            }

            return {
              ...prev,
              driver: {
                ...(prev.driver || {}),
                location: {
                  latitude: Number(event.location.latitude),
                  longitude: Number(event.location.longitude),
                  address: event.location.address,
                },
              },
            };
          });
        };

        const onChatMessage = (event: any = {}) => {
          const rideId = Number(event.rideId);
          if (!rideId || activeRideRef.current?.id !== rideId) {
            return;
          }

          appendIncomingMessage(event);
        };

        const onConnectError = (error: any) => {
          console.warn("Consumer realtime connection issue:", error?.message || error);
        };

        const onConnect = () => {
          syncRealtimeRideState().catch((error) => {
            console.warn("Consumer realtime resync failed:", error);
          });
        };

        socket.on("ride:stage-changed", onStageChanged);
        socket.on("ride:driver-location", onDriverLocation);
        socket.on("chat:message", onChatMessage);
        socket.on("connect", onConnect);
        socket.on("connect_error", onConnectError);
      } catch (error) {
        console.warn("Consumer realtime setup failed:", error);
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      leaveRideRoom();
      if (socket) {
        socket.off("ride:stage-changed");
        socket.off("ride:driver-location");
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

      if (wasBackgrounded && nextAppState === "active") {
        syncRealtimeRideState().catch((error) => {
          console.warn("Consumer foreground resync failed:", error);
        });
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (activeRide?.id && (activeRide.status === 'accepted' || activeRide.status === 'in_progress')) {
      joinRideRoom(activeRide.id);
      fetchRideMessages(activeRide.id);
      return;
    }

    leaveRideRoom();
    setChatMessages([]);
    setChatInput("");
  }, [activeRide?.id, activeRide?.status]);

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve) => {
        Geolocation.requestAuthorization(
          () => {
            setLocationPermissionGranted(true);
            resolve(true);
          },
          () => {
            setLocationPermissionGranted(false);
            resolve(false);
          }
        );
      });
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

  const fetchRideHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/api/rides/history?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecentRides(data.rides || []);
        await AsyncStorage.setItem("recentRides", JSON.stringify(data.rides || []));
      }
    } catch (e) {
      const cached = await AsyncStorage.getItem("recentRides");
      if (cached) setRecentRides(JSON.parse(cached));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Get current location (map camera only)
  const getCurrentLocation = async () => {
    setIsLocationLoading(true);

    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      Alert.alert(
        "Location Permission Required",
        "This app needs location access to show your current position.",
        [{ text: "OK", style: "default" }]
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
    } catch (error: any) {
      let errorMessage = "Could not fetch current location. ";
      switch (error.code) {
        case 1: errorMessage += "Location access denied."; break;
        case 2: errorMessage += "Location unavailable."; break;
        case 3: errorMessage += "Location request timed out."; break;
        default: errorMessage += "Unknown error occurred.";
      }
      Alert.alert("Location Error", errorMessage);
      setCurrentRegion(DEFAULT_REGION);
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Feature 1: Use current GPS position as pickup point
  // Uses watchPosition (same as driver side) to avoid GPS timeout issues
  // Uses watchPosition (same as driver side) to avoid GPS timeout issues
  const useCurrentLocationAsPickup = async () => {
    setIsLocationLoading(true);

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Location access is needed to use your current position as pickup.');
      setIsLocationLoading(false);
      return;
    }

    const TIMEOUT_MS = 20000;

    try {
      const position = await new Promise<any>((resolve, reject) => {
        let settled = false;
        let watchId: number | null = null;

        // Safety timer — reject if we get nothing in TIMEOUT_MS
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          if (watchId !== null) Geolocation.clearWatch(watchId);
          reject({ code: 3, message: 'Location timeout' });
        }, TIMEOUT_MS);

        // 1st attempt: quick network/wifi fix (no GPS wait)
        Geolocation.getCurrentPosition(
          (pos) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (watchId !== null) Geolocation.clearWatch(watchId);
            resolve(pos);
          },
          () => {
            // Network fix failed — fall through to watchPosition for GPS fix
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );

        // 2nd attempt: watchPosition grabs first GPS lock it gets
        watchId = Geolocation.watchPosition(
          (pos) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            Geolocation.clearWatch(watchId!);
            resolve(pos);
          },
          (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            Geolocation.clearWatch(watchId!);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 0,
            interval: 2000,
            fastestInterval: 1000,
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Reverse-geocode to get a human-readable address
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/reverse-geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude, longitude }),
      });
      const data = await response.json();

      const address = data?.formatted_address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      setPickup(address);
      setPickupCoords({ latitude, longitude });
      setShowPickupSuggestions(false);
      setPickupSuggestions([]);
      setCurrentRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    } catch (error: any) {
      const msg = error?.code === 3
        ? 'Location request timed out. Please enable GPS and try again.'
        : error?.code === 1
          ? 'Location permission was denied.'
          : 'Could not get your current location. Please try again or enter it manually.';
      Alert.alert('Location Error', msg);
    } finally {
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
    fetchRideHistory();
    const locationTimer = setTimeout(() => {
      getCurrentLocation();
    }, 500);

    return () => {
      clearTimeout(locationTimer);
      clearRideSearchPolling();
      clearActiveRidePolling();
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

    // Prefer "lat,lng" format — address strings can fail Google Directions
    // (especially short names, commas, or auto-resolved fallback strings).
    const originParam =
      pickupCoords?.latitude && pickupCoords?.longitude
        ? `${pickupCoords.latitude},${pickupCoords.longitude}`
        : pickupAddress;
    const destinationParam =
      dropCoords?.latitude && dropCoords?.longitude
        ? `${dropCoords.latitude},${dropCoords.longitude}`
        : dropAddress;

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
          origin: originParam,
          destination: destinationParam,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRouteCoordinates(data.route.coordinates);
        setRouteInfo({
          distance: data.route.distance,
          duration: data.route.duration,
        });

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
        // Silent failure — do NOT Alert during an active ride as it interrupts
        // the user (e.g. while typing a chat message). The map simply won't
        // show a polyline, which is acceptable.
        console.warn("Route fetch failed:", data.error);
        setRouteCoordinates([]);
        setRouteInfo(null);
      }
    } catch (error) {
      console.warn("Route fetch error:", error);
      setRouteCoordinates([]);
      setRouteInfo(null);
    } finally {
      setIsRouteFetching(false);
    }
  };

  // Coordinate-based route triggering — only fires when user manually picks
  // locations (no active ride). During an active ride, fetchActiveRide() calls
  // fetchRoute() directly, so we skip here to avoid a double fetch every poll.
  useEffect(() => {
    if (activeRide) {
      // Already handled by fetchActiveRide — skip to prevent duplicate call.
      return;
    }

    const timer = setTimeout(() => {
      if (pickupCoords && dropCoords) {
        fetchRoute(pickup, drop);
      } else {
        setRouteCoordinates([]);
        setRouteInfo(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pickupCoords, dropCoords, activeRide?.id]);

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
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success && data.ride) {
        if (data.ride.status === 'completed') {
          showPaymentForRide(data.ride);
          await fetchRideHistory();
          return;
        }

        if (data.ride.status === 'pending') {
          setCurrentRideRequest({
            ...data.ride,
            currentDriver: { fullName: "available drivers" }
          });
          setBookingStatus("Waiting for a driver to accept...");
          startRideStatusPolling(data.ride.id);
        } else {
          setActiveRide(data.ride);
        }
        setPickupCoords({
          latitude: data.ride.pickup.latitude,
          longitude: data.ride.pickup.longitude,
        });
        setDropCoords({
          latitude: data.ride.drop.latitude,
          longitude: data.ride.drop.longitude,
        });
        setPickup(data.ride.pickup.address);
        setDrop(data.ride.drop.address);
        fetchRoute(data.ride.pickup.address, data.ride.drop.address);
      } else {
        clearRideSearchPolling();
        clearActiveRidePolling();

        if (activeRide) {
          if (activeRide.status === 'in_progress') {
            showPaymentForRide({
              ...activeRide,
              status: 'completed',
            });
            await fetchRideHistory();
            return;
          }

          await fetchRideHistory();
        }

        const hadRideContext = !!activeRide || !!currentRideRequest || !!pickupCoords || !!dropCoords || routeCoordinates.length > 0;

        if (hadRideContext) {
          resetRideUiState();
        } else {
          setActiveRide(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch active ride:", error);
      clearRideSearchPolling();
      clearActiveRidePolling();
      resetRideUiState();
    } finally {
      setIsLoadingActiveRide(false);
    }
  };

  // Verify pickup OTP function
  const handleVerifyPickupOTP = async (otp: string) => {
    if (!activeRide) return;

    if (otpLocked || otpAttempts >= 5) {
      Alert.alert("OTP Locked", "Maximum verification attempts exceeded. Please contact support.");
      return;
    }

    setOtpVerifying(true);
    setOtpError('');

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/otp/rides/${activeRide.id}/verify-pickup`, {
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
        setShowPickupOTPInput(false);
        Alert.alert("OTP Verified! ✅", "Pickup verified. Driver will start the trip now.");
        await fetchActiveRide();
      } else {
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);

        if (data.error?.includes('locked') || data.error?.includes('too many attempts')) {
          setOtpLocked(true);
          setOtpError(`OTP locked. Maximum attempts exceeded.`);
          Alert.alert("OTP Locked", "Too many failed attempts. Please contact the driver.");
        } else if (newAttempts >= 5) {
          setOtpLocked(true);
          setOtpError(`Maximum attempts (5) exceeded. Cancelling ride...`);

          Alert.alert(
            "Ride Cancelled",
            "Maximum OTP verification attempts exceeded. The ride has been cancelled.",
            [{
              text: "OK", onPress: async () => {
                try {
                  const token2 = await AsyncStorage.getItem("authToken");
                  await fetch(`${API_BASE_URL}/api/rides/${activeRide.id}/cancel`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token2}` },
                  });
                } catch (err) {
                  console.error("Failed to cancel ride:", err);
                }
                setActiveRide(null);
                resetRideUiState();
              }
            }]
          );
        } else {
          const remainingAttempts = 5 - newAttempts;
          setOtpError(`Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
          Alert.alert("Verification Failed", `${data.error || "Invalid OTP"}\n\nAttempts remaining: ${remainingAttempts}/5`);
        }
      }
    } catch (error) {
      setOtpError("Network error occurred");
      Alert.alert("Error", "Network error occurred. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Poll active ride status every 10 seconds
  useEffect(() => {
    clearActiveRidePolling();

    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'in_progress')) {
      const pollInterval = setInterval(() => {
        fetchActiveRide();
      }, 10000);

      activeRidePollingRef.current = pollInterval;

      return () => clearActiveRidePolling();
    }
  }, [activeRide]);

  // Reset OTP state when ride status changes
  useEffect(() => {
    setDropOTP('');

    if (activeRide) {
      if (activeRide.status === 'accepted') {
        setOtpAttempts(0);
        setOtpLocked(false);
        setOtpError('');
        setShowPickupOTPInput(false);
      } else if (activeRide.status === 'in_progress') {
        setOtpAttempts(0);
        setOtpLocked(false);
        setOtpError('');
        setShowPickupOTPInput(false);
      }
    } else {
      setOtpAttempts(0);
      setOtpLocked(false);
      setOtpError('');
      setShowPickupOTPInput(false);
    }
  }, [activeRide?.id, activeRide?.status]);

  // Poll for drop OTP when ride is in progress
  useEffect(() => {
    if (activeRide?.status === 'in_progress' && !dropOTP) {
      const pollInterval = setInterval(async () => {
        try {
          const token = await AsyncStorage.getItem("authToken");
          const otpResponse = await fetch(`${API_BASE_URL}/api/otp/rides/${activeRide.id}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const otpData = await otpResponse.json();

          if (otpData.success && otpData.otpStatus?.drop?.otp_code) {
            setDropOTP(otpData.otpStatus.drop.otp_code);
          }
        } catch (error) {
          console.error('Failed to fetch drop OTP:', error);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    }
  }, [activeRide?.id, activeRide?.status, dropOTP]);

  // Handle payment for completed ride
  const handlePayment = async () => {
    if (!completedRideForPayment) return;

    setPaymentLoading(true);
    setPaymentStatus('processing');
    setPaymentError('');

    try {
      const result = await processPayment(
        completedRideForPayment.id,
        {
          name: user?.fullName || 'Customer',
          email: user?.email || '',
          phone: user?.phone || '',
        }
      );

      if (result.success) {
        setPaymentStatus('success');
        setTimeout(() => {
          // Reset states after showing success
          setShowPaymentScreen(false);
          setCompletedRideForPayment(null);
          resetRideUiState();
          fetchRideHistory();
          Alert.alert(
            "Payment Successful! 🎉",
            `Amount paid: ₹${result.payment?.amount || completedRideForPayment.fare}\n\nThank you for riding with SoberFolk!`
          );
        }, 2000);
      } else {
        if (result.cancelled) {
          setPaymentStatus('pending');
          setPaymentError('Payment was cancelled. Please try again.');
        } else {
          setPaymentStatus('failed');
          setPaymentError(result.error || 'Payment failed. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setPaymentError(error.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Skip payment (for testing/support)
  const handleSkipPayment = () => {
    Alert.alert(
      "Skip Payment?",
      "You can pay later from your ride history. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip for Now",
          onPress: () => {
            setShowPaymentScreen(false);
            setCompletedRideForPayment(null);
            resetRideUiState();
            fetchRideHistory();
          }
        }
      ]
    );
  };

  // Poll for ride status
  const startRideStatusPolling = async (rideId: number) => {
    clearRideSearchPolling();

    const interval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/status`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.status === 'accepted') {
            clearRideSearchPolling();
            setIsBooking(false);
            setBookingStatus('');
            setCurrentRideRequest(null);
            setDriverQueue([]);
            await fetchActiveRide();
            Alert.alert("Ride Accepted! 🎉", `Your ride has been accepted!\n\nDriver is on the way to your pickup location.`);
          } else if (data.status === 'no_drivers') {
            clearRideSearchPolling();
            setIsBooking(false);
            setBookingStatus('');
            Alert.alert("No Drivers Available", "All drivers are currently busy. Please try again later.");
            setCurrentRideRequest(null);
            setDriverQueue([]);
            fetchRideHistory();
          } else if (data.currentDriver) {
            setBookingStatus(`Waiting for driver ${data.currentDriver.name} (${data.currentDriver.queuePosition}/${data.currentDriver.totalDrivers}) to accept...`);
          }
        }
      } catch (error) {
        console.error("Status polling error:", error);
      }
    }, 3000);

    statusPollingIntervalRef.current = interval;
    setStatusPollingInterval(interval);

    statusPollingTimeoutRef.current = setTimeout(() => {
      clearRideSearchPolling();
      if (isBooking) {
        setIsBooking(false);
        setBookingStatus('');
        Alert.alert("Timeout", "Ride request timed out. Please try again.");
      }
    }, 120000);
  };

  // Step 1: Validate fields and open safety contacts modal
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
    if (isBookingForSomeoneElse && !passengerId) {
      Alert.alert("Passenger Not Verified", "Please search and verify the passenger before booking the ride.");
      return;
    }
    // Open optional safety contacts modal
    setPendingBookingContacts([...safetyContacts]);
    setShowSafetyModal(true);
  };

  // Step 2: Actually create the ride (called from modal Confirm or Skip)
  const proceedWithBooking = async (contacts: {name: string; phone: string}[]) => {
    if (isBookingForSomeoneElse && !passengerId) {
      Alert.alert("Passenger Not Verified", "Please search and verify the passenger before booking the ride.");
      return;
    }

    setShowSafetyModal(false);
    setIsBooking(true);
    setBookingStatus('Finding nearby drivers...');

    let finalContacts = [...contacts];
    if (isBookingForSomeoneElse && user?.phone) {
      // Auto-inject the booker as a safety contact so they get the tracking link
      if (!finalContacts.find(c => c.phone === user.phone)) {
        finalContacts.push({ name: 'Booker (You)', phone: user.phone });
      }
    }

    try {
      const drivers = await findNearbyDrivers();

      if (!drivers || drivers.length === 0) {
        Alert.alert("No Drivers Available", "Sorry, no drivers are available in your area right now. Please try again later.");
        setIsBooking(false);
        setBookingStatus('');
        return;
      }

      setDriverQueue(drivers);
      setBookingStatus(`Found ${drivers.length} driver(s). Creating ride request...`);

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
          driverQueue: drivers,
          safetyContacts: finalContacts,
          passengerId: isBookingForSomeoneElse ? passengerId : undefined,
          bookerInfo: isBookingForSomeoneElse ? {
            name: user?.full_name || 'Booker',
            phone: user?.phone
          } : null
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Persist contacts for next ride
        if (contacts.length > 0) {
          setSafetyContacts(contacts);
        }

        if (isBookingForSomeoneElse) {
          Alert.alert(
            "Booking Successful! 🎉",
            "The ride has been booked for the passenger. They can track the ride and view their OTP directly in their SoberFolk app. You will also receive WhatsApp updates.",
            [{ text: "OK", onPress: resetRideUiState }]
          );
          setIsBooking(false);
          return;
        }

        setCurrentRideRequest(data.ride);
        setBookingStatus(`Waiting for driver ${data.ride.currentDriver.fullName} to accept...`);
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

  // Handle Android Back Button
  useEffect(() => {
    const backAction = () => {
      // Close safety modal first if open
      if (showSafetyModal) {
        setShowSafetyModal(false);
        return true;
      }
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              await AsyncStorage.removeItem("authToken");
              await AsyncStorage.removeItem("currentUser");
              await AsyncStorage.removeItem("userRole");
              await AsyncStorage.removeItem("recentRides");
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            }
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [navigation, showSafetyModal]);

  // ─── Safety Contacts Modal ───────────────────────────────────────────────────
  // ─── Passenger Verification ──────────────────────────────────────────────────
  const verifyPassenger = async () => {
    if (!passengerPhoneInput || passengerPhoneInput.length < 10) {
      setPassengerVerifyError("Enter a valid phone number");
      return;
    }
    
    setIsVerifyingPassenger(true);
    setPassengerVerifyError("");
    setVerifiedPassengerName(null);
    setPassengerId(null);
    
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/profile/consumer/search?phone=${encodeURIComponent(passengerPhoneInput)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.success && data.consumer) {
        setVerifiedPassengerName(data.consumer.full_name || data.consumer.fullName || "Passenger");
        setPassengerId(Number(data.consumer.id));
      } else {
        setPassengerVerifyError(data.error || "User must have SoberFolk installed");
      }
    } catch (error) {
      setPassengerVerifyError("Failed to search user. Check connection.");
    } finally {
      setIsVerifyingPassenger(false);
    }
  };

  const openContactPicker = async (target: 'passenger' | 'safety') => {
    try {
      let hasPermission = false;

      if (Platform.OS === 'ios') {
        const currentPermission = await Contacts.checkPermission();
        const permission =
          currentPermission === 'undefined'
            ? await Contacts.requestPermission()
            : currentPermission;
        hasPermission = permission === 'authorized';
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts',
            message: 'SoberFolk needs access to your contacts.',
            buttonPositive: 'Allow'
          }
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (hasPermission) {
        setTargetContactInput(target);
        setShowContactPicker(true);
        setIsContactsLoading(true);
        const allContacts = await Contacts.getAll();
        const sorted = allContacts.sort((a, b) => {
          const nameA = (a.displayName || a.givenName || '').toLowerCase();
          const nameB = (b.displayName || b.givenName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setContactsList(sorted);
        setFilteredContacts(sorted);
        setIsContactsLoading(false);
      } else {
        Alert.alert("Permission Denied", "Cannot access contacts without permission.");
      }
    } catch (err) {
      console.warn(err);
      setIsContactsLoading(false);
    }
  };

  const handleSelectContactFromList = (contact: any) => {
    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      Alert.alert("No Phone Number", "This contact doesn't have a phone number.");
      return;
    }
    const phone = contact.phoneNumbers[0].number.replace(/[^0-9+]/g, '');
    const name = contact.displayName || contact.givenName || 'Unknown Contact';

    if (targetContactInput === 'passenger') {
      setPassengerPhoneInput(phone);
    } else if (targetContactInput === 'safety') {
      if (pendingBookingContacts.length < 5) {
         setPendingBookingContacts(prev => [...prev, { name, phone }]);
      }
    }

    setShowContactPicker(false);
    setContactSearchText('');
  };

  const handlePickPassengerContact = () => openContactPicker('passenger');
  const handlePickContact = () => openContactPicker('safety');

  const renderContactPickerModal = () => (
    <Modal
      visible={showContactPicker}
      animationType="slide"
      onRequestClose={() => setShowContactPicker(false)}
    >
      <View style={styles.contactModalContainer}>
        <View style={styles.contactModalHeader}>
          <Text style={styles.contactModalTitle}>Select Contact</Text>
          <TouchableOpacity onPress={() => setShowContactPicker(false)} style={styles.contactModalCloseBtn}>
            <Icon name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.contactSearchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#94a3b8"
          value={contactSearchText}
          onChangeText={(text) => {
            setContactSearchText(text);
            if (text) {
              setFilteredContacts(
                contactsList.filter(c => {
                  const name = (c.displayName || c.givenName || '').toLowerCase();
                  return name.includes(text.toLowerCase());
                })
              );
            } else {
              setFilteredContacts(contactsList);
            }
          }}
        />
        {isContactsLoading ? (
          <ActivityIndicator size="large" color="#667eea" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={item => item.recordID}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactListItem} onPress={() => handleSelectContactFromList(item)}>
                <View style={styles.contactListAvatar}>
                  <Text style={styles.contactListAvatarText}>
                    {(item.displayName || item.givenName || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactListInfo}>
                  <Text style={styles.contactListName}>{item.displayName || item.givenName}</Text>
                  <Text style={styles.contactListPhone}>
                    {item.phoneNumbers && item.phoneNumbers.length > 0 ? item.phoneNumbers[0].number : 'No phone number'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );

  const renderSafetyModal = () => (
    <Modal
      visible={showSafetyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSafetyModal(false)}
      statusBarTranslucent
    >
      <View style={styles.safetyModalOverlay}>
        <View style={styles.safetyModal}>
          {/* Header */}
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.safetyModalHeader}>
            <Text style={styles.safetyModalTitle}>```🛡️ Safety Contacts```</Text>
            <Text style={styles.safetyModalSub}>We'll send ride details & live tracking to these numbers via WhatsApp</Text>
          </LinearGradient>

          <ScrollView style={styles.safetyModalBody} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {/* Existing contacts */}
            {pendingBookingContacts.map((c, i) => (
              <View key={i} style={styles.safetyContactRow}>
                <Icon name="person" size={18} color="#667eea" />
                <Text style={styles.safetyContactPhone} numberOfLines={1}>
                  {c.name ? `${c.name} · ` : ''}{c.phone}
                </Text>
                <TouchableOpacity
                  onPress={() => setPendingBookingContacts(prev => prev.filter((_, idx) => idx !== i))}
                  style={styles.safetyRemoveBtn}
                >
                  <Icon name="close" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add number input */}
            {pendingBookingContacts.length < 5 && (
              <View style={styles.safetyInputWrapper}>
                <View style={styles.safetyInputRow}>
                  <TextInput
                    style={[styles.safetyInput, { flex: 0.4, marginRight: 8 }]}
                    placeholder="Name (opt)"
                    placeholderTextColor="#94a3b8"
                    value={safetyContactNameInput}
                    onChangeText={setSafetyContactNameInput}
                    maxLength={20}
                  />
                  <TextInput
                    style={[styles.safetyInput, { flex: 0.6 }]}
                    placeholder="+91 phone number"
                    placeholderTextColor="#94a3b8"
                    value={safetyContactInput}
                    onChangeText={setSafetyContactInput}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                  <TouchableOpacity
                    style={styles.safetyAddBtn}
                    onPress={() => {
                      const ph = safetyContactInput.trim();
                      const nm = safetyContactNameInput.trim();
                      if (!ph || ph.length < 7) return;
                      if (pendingBookingContacts.length >= 5) return;
                      setPendingBookingContacts(prev => [...prev, { name: nm, phone: ph }]);
                      setSafetyContactInput('');
                      setSafetyContactNameInput('');
                    }}
                  >
                    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.safetyAddBtnGradient}>
                      <Icon name="add" size={22} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.pickContactBtn} onPress={handlePickContact}>
                  <Icon name="contacts" size={16} color="#667eea" />
                  <Text style={styles.pickContactText}>Choose from Contacts</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.safetyHint}>Up to 5 numbers · They'll get WhatsApp alerts when ride is accepted & started</Text>
          </ScrollView>

          {/* Actions */}
          <View style={styles.safetyModalActions}>
            <TouchableOpacity style={styles.safetySkipBtn} onPress={() => proceedWithBooking([])}>
              <Text style={styles.safetySkipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.safetyConfirmBtn} onPress={() => {
              const typedPhone = safetyContactInput.trim();
              const typedName = safetyContactNameInput.trim();
              const finalContacts = [...pendingBookingContacts];
              if (typedPhone.length >= 7 && finalContacts.length < 5) {
                finalContacts.push({ name: typedName, phone: typedPhone });
                setSafetyContactInput('');
                setSafetyContactNameInput('');
              }
              proceedWithBooking(finalContacts);
            }}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.safetyConfirmGradient}>
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.safetyConfirmText}>
                  {pendingBookingContacts.length > 0 ? `Confirm & Book (${pendingBookingContacts.length})` : 'Book Without Safety'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "BookRide":
        return (
          <Animated.View style={[styles.mapContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {completedRideForPayment && paymentStatus !== 'success' && !showPaymentScreen && (
              <View style={styles.paymentPromptCard}>
                <View style={styles.paymentPromptTextBlock}>
                  <Text style={styles.paymentPromptTitle}>Ride completed</Text>
                  <Text style={styles.paymentPromptSubtitle}>
                    Fare due: ₹{completedRideForPayment.fare || '0'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.paymentPromptButton}
                  onPress={() => {
                    setPaymentError('');
                    setPaymentStatus('pending');
                    setShowPaymentScreen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.paymentPromptButtonGradient}
                  >
                    <Icon name="payment" size={18} color="#fff" />
                    <Text style={styles.paymentPromptButtonText}>Pay Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Active Ride Banner */}
            {activeRide && (
              <View style={styles.activeRideBanner}>
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  style={styles.activeRideBannerScroll}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  <LinearGradient
                    colors={activeRide.status === 'in_progress' ? ['#10b981', '#059669'] : ['#f59e0b', '#d97706']}
                    style={styles.activeRideGradient}
                  >
                    <View style={styles.activeRideHeader}>
                      <Text style={styles.activeRideTitle}>
                        {activeRide.status === 'accepted' ? '🚗 Driver is coming!' : '🛣️ Trip in progress'}
                      </Text>
                      <View style={styles.activeRideStatusBadge}>
                        <Text style={styles.activeRideStatusText}>
                          {activeRide.status.toUpperCase().replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {activeRide.status === 'accepted' && (
                      <View style={styles.otpSection}>
                        {!showPickupOTPInput ? (
                          <TouchableOpacity
                            style={styles.verifyDriverButton}
                            onPress={() => setShowPickupOTPInput(true)}
                          >
                            <Icon name="verified-user" size={40} color="#8B5CF6" />
                            <Text style={styles.verifyDriverButtonText}>Verify Pickup OTP</Text>
                            <Text style={styles.verifyDriverButtonSubtext}>
                              Tap to enter the OTP shown by the driver
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <OTPInput
                            title="Verify Pickup OTP"
                            subtitle="Enter the OTP shown by the driver"
                            onVerify={handleVerifyPickupOTP}
                            loading={otpVerifying}
                            error={otpError}
                            attempts={otpAttempts}
                            maxAttempts={5}
                          />
                        )}
                      </View>
                    )}

                    {activeRide.status === 'in_progress' && (
                      <View style={styles.otpSection}>
                        {dropOTP ? (
                          <OTPDisplay
                            otp={dropOTP}
                            title="Drop OTP"
                            subtitle="Show this OTP to the driver at destination"
                          />
                        ) : (
                          <View style={styles.otpLoadingContainer}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.otpLoadingText}>Fetching drop OTP...</Text>
                          </View>
                        )}
                      </View>
                    )}

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


                    {/* Driver Info */}
                    {activeRide.driver && (
                      <View style={styles.driverInfoCard}>
                        <View style={styles.driverPhotoContainer}>
                          <Image
                            source={{ uri: activeRide.driver.profilePhoto || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
                            style={styles.driverPhoto}
                          />
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
                          <Text style={styles.rideChatEmptyText}>No messages yet. Say hello to your driver.</Text>
                        ) : (
                          chatMessages.map((message, index) => {
                            const key = message.id || `${message.clientMessageId || "msg"}-${index}`;
                            const isOwn = Number(message.senderId || message.sender_id) === Number(userIdRef.current);

                            return (
                              <View key={key} style={[styles.rideChatBubble, isOwn ? styles.rideChatBubbleOwn : styles.rideChatBubbleOther]}>
                                <Text style={styles.rideChatSender}>{isOwn ? 'You' : (message.senderRole || message.sender_role || 'Driver')}</Text>
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
                          placeholder="Message driver..."
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

                    {/* Action Buttons */}
                    <View style={styles.activeRideActions}>
                      <TouchableOpacity
                        style={styles.callDriverButton}
                        onPress={() => {
                          const driverPhone = activeRide.driver?.phone;
                          Alert.alert(
                            "Call Driver",
                            `Would you like to call ${activeRide.driver?.name || "your driver"}?\n${driverPhone || "Phone number unavailable"}`,
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Call", onPress: () => callPhoneNumber(driverPhone) }
                            ]
                          );
                        }}
                      >
                        <Icon name="call" size={20} color="#fff" />
                        <Text style={styles.callDriverText}>Call Driver</Text>
                      </TouchableOpacity>

                      {activeRide.status === 'accepted' && (
                        <TouchableOpacity
                          style={styles.cancelRideButton}
                          onPress={handleCancelActiveRide}
                        >
                          <Icon name="cancel" size={20} color="#fff" />
                          <Text style={styles.cancelRideText}>Cancel Ride</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>
                </ScrollView>
              </View>
            )}

            <View style={styles.mapWrapper}>
              <MapView
                style={styles.map}
                initialRegion={DEFAULT_REGION}
                region={currentRegion}
                showsUserLocation={!activeRide && locationPermissionGranted}
                showsMyLocationButton={false}
                loadingEnabled={true}
                loadingIndicatorColor="#667eea"
              >
                {/* No active ride: show user dot if no pickup selected */}
                {!activeRide && currentRegion && locationPermissionGranted && !pickupCoords && (
                  <Marker coordinate={currentRegion} title="Your Location" pinColor="#667eea" />
                )}

                {pickupCoords && (
                  <Marker coordinate={pickupCoords} title="Pickup" description={pickup}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.markerGradient}>
                      <Text style={styles.markerText}>P</Text>
                    </LinearGradient>
                  </Marker>
                )}

                {dropCoords && (
                  <Marker coordinate={dropCoords} title="Drop" description={drop}>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.markerGradient}>
                      <Text style={styles.markerText}>D</Text>
                    </LinearGradient>
                  </Marker>
                )}

                {/* Feature 2: Live driver marker — shown during accepted and in_progress */}
                {(activeRide?.driver?.location?.latitude && activeRide?.driver?.location?.longitude) ? (
                  <Marker
                    coordinate={{
                      latitude: Number(activeRide.driver.location.latitude),
                      longitude: Number(activeRide.driver.location.longitude),
                    }}
                    title={`Driver: ${activeRide.driver?.name || 'Driver'}`}
                    description={activeRide.status === 'accepted' ? 'On the way to pickup' : 'Trip in progress'}
                  >
                    <View style={styles.driverMarker}>
                      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.driverMarkerGradient}>
                        <Icon name="directions-car" size={18} color="#fff" />
                      </LinearGradient>
                    </View>
                  </Marker>
                ) : null}

                {routeCoordinates.length > 0 && (
                  <Polyline coordinates={routeCoordinates} strokeColor="#667eea" strokeWidth={5} />
                )}
              </MapView>

              {/* Route Info Banner */}
              {routeInfo && (
                <View style={styles.routeInfoBanner}>
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.routeInfoGradient}>
                    <Text style={styles.routeInfoText}>
                      🚗 {routeInfo.distance} • ⏱️ {routeInfo.duration}
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {/* Location Refresh Button */}
              <View style={styles.mapOverlay}>
                <TouchableOpacity onPress={refreshLocation} disabled={isLocationLoading} style={styles.locationButton}>
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.locationButtonGradient}>
                    <Icon name="my-location" size={24} color="#fff" />
                  </LinearGradient>
                  {isLocationLoading && <ActivityIndicator size="small" color="#667eea" style={styles.loadingIndicator} />}
                </TouchableOpacity>
              </View>

              {/* Route Fetching Indicator */}
              {isRouteFetching && (
                <View style={styles.routeFetchingIndicator}>
                  <ActivityIndicator size="small" color="#667eea" />
                  <Text style={styles.routeFetchingText}>Finding route...</Text>
                </View>
              )}
            </View>

              <View style={styles.locationInputs}>
                {/* Book for Someone Else Toggle */}
                <View style={styles.bookForOtherToggle}>
                  <Text style={styles.bookForOtherText}>Book for someone else</Text>
                  <Switch
                    value={isBookingForSomeoneElse}
                    onValueChange={(val) => {
                      setIsBookingForSomeoneElse(val);
                      if (!val) {
                        setVerifiedPassengerName(null);
                        setPassengerId(null);
                        setPassengerPhoneInput('');
                      }
                    }}
                    trackColor={{ false: '#334155', true: '#10b981' }}
                    thumbColor={isBookingForSomeoneElse ? '#fff' : '#94a3b8'}
                  />
                </View>

                {isBookingForSomeoneElse && (
                  <View style={styles.passengerSearchBox}>
                    <View style={styles.safetyInputRow}>
                      <TextInput
                        style={[styles.safetyInput, { flex: 1 }]}
                        placeholder="Passenger +91 Phone"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        value={passengerPhoneInput}
                        onChangeText={(text) => {
                          setPassengerPhoneInput(text);
                          setVerifiedPassengerName(null);
                          setPassengerId(null);
                          setPassengerVerifyError('');
                        }}
                      />
                      <TouchableOpacity style={styles.searchBtn} onPress={verifyPassenger}>
                        {isVerifyingPassenger ? (
                           <ActivityIndicator size="small" color="#fff" />
                        ) : (
                           <Icon name="search" size={20} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.passengerActionRow}>
                      <TouchableOpacity style={styles.pickContactBtnSmall} onPress={handlePickPassengerContact}>
                        <Icon name="contacts" size={14} color="#667eea" />
                        <Text style={styles.pickContactText}>Contacts</Text>
                      </TouchableOpacity>
                      {verifiedPassengerName ? (
                        <View style={styles.verifiedBadge}>
                          <Icon name="check-circle" size={14} color="#10b981" />
                          <Text style={styles.verifiedText}>{verifiedPassengerName}</Text>
                        </View>
                      ) : null}
                    </View>
                    {passengerVerifyError ? <Text style={styles.errorTextSmall}>{passengerVerifyError}</Text> : null}
                  </View>
                )}

                {/* Feature 1: Use Current Location as Pickup (hidden if booking for someone else) */}
                {!isBookingForSomeoneElse && (
                  <TouchableOpacity
                    style={styles.currentLocationButton}
                    onPress={useCurrentLocationAsPickup}
                    disabled={isLocationLoading}
                  >
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.currentLocationGradient}>
                      {isLocationLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Icon name="my-location" size={18} color="#fff" />
                      )}
                      <Text style={styles.currentLocationText}>
                        {isLocationLoading ? 'Getting location...' : 'Use My Current Location as Pickup'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Pickup Input */}
                <View style={styles.inputContainer}>
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.inputIconContainer}>
                    <Icon name="location-on" size={22} color="#fff" />
                  </LinearGradient>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter pickup location"
                    placeholderTextColor="#94a3b8"
                    value={pickup}
                    onChangeText={(text) => {
                      setPickup(text);
                      if (!text.trim()) {
                        setPickupCoords(null);
                        setShowPickupSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (pickupSuggestions.length > 0) setShowPickupSuggestions(true);
                    }}
                  />
                  {isLoadingPickupSuggestions && <ActivityIndicator size="small" color="#667eea" style={{ marginRight: 8 }} />}
                </View>

                {/* Pickup Suggestions Dropdown */}
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                    {pickupSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={suggestion.place_id || index}
                        style={styles.suggestionItem}
                        onPress={() => handlePlaceSelect(suggestion.place_id, suggestion.description, true)}
                      >
                        <View style={styles.suggestionIconContainer}>
                          <Icon name="location-on" size={20} color="#667eea" />
                        </View>
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionMainText}>{suggestion.main_text}</Text>
                          <Text style={styles.suggestionSecondaryText} numberOfLines={1}>{suggestion.secondary_text}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Drop Input */}
                <View style={styles.inputContainer}>
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.inputIconContainer}>
                    <Icon name="flag" size={22} color="#fff" />
                  </LinearGradient>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter drop location"
                    placeholderTextColor="#94a3b8"
                    value={drop}
                    onChangeText={(text) => {
                      setDrop(text);
                      if (!text.trim()) {
                        setDropCoords(null);
                        setShowDropSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (dropSuggestions.length > 0) setShowDropSuggestions(true);
                    }}
                  />
                  {isLoadingDropSuggestions && <ActivityIndicator size="small" color="#667eea" style={{ marginRight: 8 }} />}
                </View>

                {/* Drop Suggestions Dropdown */}
                {showDropSuggestions && dropSuggestions.length > 0 && (
                  <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                    {dropSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={suggestion.place_id || index}
                        style={styles.suggestionItem}
                        onPress={() => handlePlaceSelect(suggestion.place_id, suggestion.description, false)}
                      >
                        <View style={styles.suggestionIconContainer}>
                          <Icon name="flag" size={20} color="#667eea" />
                        </View>
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionMainText}>{suggestion.main_text}</Text>
                          <Text style={styles.suggestionSecondaryText} numberOfLines={1}>{suggestion.secondary_text}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity style={[styles.bookButton, isBooking && styles.disabledButton]} onPress={handleBookRide} disabled={isBooking}>
                  <LinearGradient colors={isBooking ? ["#94a3b8", "#64748b"] : ["#667eea", "#764ba2"]} style={styles.bookButtonGradient}>
                    {isBooking ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" style={{ marginRight: 12 }} />
                        <Text style={styles.bookButtonText}>Booking...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.bookButtonText}>Book Ride Now</Text>
                        <Icon name="arrow-forward" size={24} color="#fff" />
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
          </Animated.View>
        );

      case "RecentRides":
        return (
          <Animated.View style={[styles.contentBox, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>Recent Rides</Text>

            {isLoadingHistory ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.emptyStateText}>Loading ride history...</Text>
              </View>
            ) : recentRides.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyStateIconContainer}>
                  <Icon name="history" size={40} color="#fff" />
                </LinearGradient>
                <Text style={styles.emptyStateText}>No rides yet</Text>
                <Text style={styles.emptyStateSubText}>Book your first ride to see it here!</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.ridesScrollView}>
                {recentRides.map((ride) => (
                  <LinearGradient key={ride.id} colors={['#fff', '#f8fafc']} style={styles.rideCard}>
                    <View style={styles.rideHeader}>
                      <Text style={styles.rideDate}>
                        {new Date(ride.createdAt).toLocaleDateString()} •{" "}
                        {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View style={[styles.statusBadge, ride.status === "completed" ? styles.completedBadge : styles.bookedBadge]}>
                        <Text style={styles.statusText}>{ride.status?.toUpperCase() || "COMPLETED"}</Text>
                      </View>
                    </View>

                    <View style={styles.rideDetails}>
                      <View style={styles.locationRow}>
                        <LinearGradient colors={['#667eea', '#764ba2']} style={[styles.dot, styles.pickupDot]} />
                        <Text style={styles.locationText} numberOfLines={2}>{ride.pickup?.address || "Unknown pickup"}</Text>
                      </View>
                      <View style={styles.dividerLine} />
                      <View style={styles.locationRow}>
                        <LinearGradient colors={['#ef4444', '#dc2626']} style={[styles.dot, styles.dropDot]} />
                        <Text style={styles.locationText} numberOfLines={2}>{ride.drop?.address || "Unknown drop"}</Text>
                      </View>
                    </View>

                    <View style={styles.rideFooter}>
                      <Text style={styles.fareText}>₹{ride.fare}</Text>
                      {ride.status === "completed" && (
                        <TouchableOpacity
                          style={styles.rateNowButton}
                          onPress={() => {
                            const driverInfo = ride.driver ? {
                              name: ride.driver.name,
                              phone: ride.driver.phone,
                              profilePhoto: ride.driver.profilePhoto || null,
                            } : null;
                            const rideDetails = {
                              pickup: ride.pickup.address,
                              drop: ride.drop.address,
                              fare: ride.fare,
                              date: new Date(ride.createdAt).toLocaleString(),
                            };
                            navigation.navigate("ConsumerFeedback", { rideId: ride.id, driverInfo, rideDetails });
                          }}
                        >
                          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.rateNowGradient}>
                            <Text style={styles.rateNowText}>Rate Now</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        );

      case "MyDetails":
        return (
          <Animated.View style={[styles.contentBox, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>My Profile</Text>
            {user ? (
              <View style={styles.profileContainer}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.profileImageContainer}>
                  {user.profilePhoto ? (
                    <Image source={{ uri: user.profilePhoto }} style={styles.profileImage} />
                  ) : (
                    <Icon name="person" size={55} color="#fff" />
                  )}
                </LinearGradient>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.detailIconContainer}>
                        <Icon name="phone" size={20} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.detailText}>{user.phone || "Not provided"}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.detailIconContainer}>
                        <Icon name="wc" size={20} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.detailText}>{user.gender || "Not specified"}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.detailIconContainer}>
                        <Icon name="cake" size={20} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.detailText}>{user.dateOfBirth || "Not provided"}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.detailIconContainer}>
                        <Icon name="home" size={20} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.detailText} numberOfLines={1}>{user.address || "Address not provided"}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyStateIconContainer}>
                  <Icon name="person" size={40} color="#fff" />
                </LinearGradient>
                <Text style={styles.emptyStateText}>User details not available</Text>
                <Text style={styles.emptyStateSubText}>Please log in to view your profile</Text>
              </View>
            )}
          </Animated.View>
        );
      default:
        return null;
    }
  };

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
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Welcome back, {user ? user.fullName?.split(' ')[0] || "Rider" : "Rider"}</Text>
        <Text style={styles.subheader}>Ready for your next ride?</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: "BookRide", label: "Book Ride", icon: "directions-car" },
          { key: "RecentRides", label: "Recent Rides", icon: "history" },
          { key: "MyDetails", label: "My Details", icon: "person" }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab.key as any);
              if (tab.key === "RecentRides") fetchRideHistory();
            }}
          >
            <LinearGradient
              colors={activeTab === tab.key ? ['#667eea', '#764ba2'] : ['#fff', '#f8fafc']}
              style={styles.tabButtonContent}
            >
              <Icon name={tab.icon as any} size={24} color={activeTab === tab.key ? "#fff" : "#64748b"} />
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

      {/* Payment Modal */}
      <Modal
        visible={showPaymentScreen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (paymentStatus !== 'processing') {
            handleSkipPayment();
          }
        }}
      >
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModalContainer}>
            {/* Payment Header */}
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.paymentModalHeader}
            >
              <Icon name="payment" size={40} color="#fff" />
              <Text style={styles.paymentModalTitle}>
                {paymentStatus === 'success' ? 'Payment Successful!' : 'Complete Payment'}
              </Text>
            </LinearGradient>

            {/* Payment Content */}
            <View style={styles.paymentModalContent}>
              {paymentStatus === 'success' ? (
                <View style={styles.paymentSuccessContainer}>
                  <View style={styles.paymentSuccessIcon}>
                    <Icon name="check-circle" size={80} color="#4CAF50" />
                  </View>
                  <Text style={styles.paymentSuccessText}>Thank you for your payment!</Text>
                  <Text style={styles.paymentSuccessAmount}>
                    ₹{completedRideForPayment?.fare || '0'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Ride Summary */}
                  <View style={styles.paymentRideSummary}>
                    <Text style={styles.paymentSectionTitle}>Ride Summary</Text>
                    <View style={styles.paymentLocationRow}>
                      <View style={styles.paymentLocationDot} />
                      <Text style={styles.paymentLocationText} numberOfLines={2}>
                        {completedRideForPayment?.pickup_address || 'Pickup Location'}
                      </Text>
                    </View>
                    <View style={styles.paymentLocationLine} />
                    <View style={styles.paymentLocationRow}>
                      <View style={[styles.paymentLocationDot, { backgroundColor: '#f44336' }]} />
                      <Text style={styles.paymentLocationText} numberOfLines={2}>
                        {completedRideForPayment?.drop_address || 'Drop Location'}
                      </Text>
                    </View>
                  </View>

                  {/* Fare Breakdown */}
                  <View style={styles.paymentFareBreakdown}>
                    <Text style={styles.paymentSectionTitle}>Fare Details</Text>
                    <View style={styles.paymentFareRow}>
                      <Text style={styles.paymentFareLabel}>Distance</Text>
                      <Text style={styles.paymentFareValue}>
                        {completedRideForPayment?.distance ? `${completedRideForPayment.distance} km` : '-'}
                      </Text>
                    </View>
                    <View style={styles.paymentFareRow}>
                      <Text style={styles.paymentFareLabel}>Duration</Text>
                      <Text style={styles.paymentFareValue}>
                        {completedRideForPayment?.duration ? `${completedRideForPayment.duration} mins` : '-'}
                      </Text>
                    </View>
                    <View style={[styles.paymentFareRow, styles.paymentFareTotalRow]}>
                      <Text style={styles.paymentFareTotalLabel}>Total Amount</Text>
                      <Text style={styles.paymentFareTotalValue}>
                        ₹{completedRideForPayment?.fare || '0'}
                      </Text>
                    </View>
                  </View>

                  {/* Error Message */}
                  {paymentError ? (
                    <View style={styles.paymentErrorContainer}>
                      <Icon name="error-outline" size={20} color="#f44336" />
                      <Text style={styles.paymentErrorText}>{paymentError}</Text>
                    </View>
                  ) : null}

                  {/* Payment Buttons */}
                  <View style={styles.paymentButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.paymentPayButton,
                        paymentLoading && styles.paymentButtonDisabled
                      ]}
                      onPress={handlePayment}
                      disabled={paymentLoading}
                    >
                      <LinearGradient
                        colors={paymentLoading ? ['#94a3b8', '#94a3b8'] : ['#667eea', '#764ba2']}
                        style={styles.paymentPayButtonGradient}
                      >
                        {paymentLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Icon name="lock" size={20} color="#fff" />
                            <Text style={styles.paymentPayButtonText}>
                              Pay Now ₹{completedRideForPayment?.fare || '0'}
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.paymentSkipButton}
                      onPress={handleSkipPayment}
                      disabled={paymentLoading}
                    >
                      <Text style={styles.paymentSkipButtonText}>Pay Later</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Secure Payment Badge */}
                  <View style={styles.paymentSecureBadge}>
                    <Icon name="verified-user" size={16} color="#667eea" />
                    <Text style={styles.paymentSecureText}>Secured by Razorpay</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {renderSafetyModal()}
      {renderContactPickerModal()}
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
    width: 300,
    height: 300,
    backgroundColor: '#667eea',
    top: -100,
    right: -100,
    borderRadius: 150,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: '#764ba2',
    bottom: 50,
    left: -50,
    borderRadius: 100,
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: '#f59e0b',
    top: '30%',
    right: -30,
    borderRadius: 75,
    opacity: 0.08,
  },
  gridPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.03,
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subheader: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 60,
    marginHorizontal: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 50,
    overflow: 'hidden',
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 50,
    gap: 4,
  },
  activeTab: {
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#fff',
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
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  map: {
    flex: 1,
  },
  markerGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  markerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  routeInfoBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 80,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  routeInfoGradient: {
    padding: 12,
    borderRadius: 16,
  },
  routeInfoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  routeFetchingIndicator: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    marginLeft: -75,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
  },
  routeFetchingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingIndicator: {
    marginTop: 8,
  },
  locationInputs: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  bookForOtherToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  bookForOtherText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  passengerSearchBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBtn: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  pickContactBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  verifiedText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  errorTextSmall: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  currentLocationButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  currentLocationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
    borderRadius: 14,
  },
  currentLocationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  driverMarker: {
    alignItems: 'center',
  },
  driverMarkerGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 12,
    color: '#64748b',
  },
  bookButton: {
    borderRadius: 50,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bookingStatusContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bookingStatusText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  driverQueueInfo: {
    marginTop: 8,
  },
  driverQueueTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  driverQueueItem: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    paddingLeft: 8,
  },
  contentBox: {
    flex: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  ridesScrollView: {
    flex: 1,
  },
  rideCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  bookedBadge: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
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
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  pickupDot: {},
  dropDot: {},
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
    marginLeft: 11,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#667eea',
  },
  rateNowButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  rateNowGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  rateNowText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImage: {
    width: 114,
    height: 114,
    borderRadius: 57,
  },
  userInfo: {
    width: '100%',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailsGrid: {
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  activeRideBanner: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 500,
  },
  paymentPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  paymentPromptTextBlock: {
    flex: 1,
  },
  paymentPromptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentPromptSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  paymentPromptButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  paymentPromptButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  paymentPromptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  activeRideBannerScroll: {
    maxHeight: 500,
  },
  activeRideGradient: {
    padding: 20,
  },
  activeRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeRideTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  activeRideStatusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeRideStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  otpSection: {
    marginVertical: 12,
  },
  verifyDriverButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  verifyDriverButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    marginTop: 12,
    marginBottom: 4,
  },
  verifyDriverButtonSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  otpLoadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  otpLoadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
  etaContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  etaTime: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  etaSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  driverInfoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  driverPhotoContainer: {
    marginRight: 14,
  },
  driverPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  driverScooter: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  activeTripDetails: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  activeTripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeTripLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  activeTripValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  activeTripFare: {
    fontSize: 18,
    fontWeight: '800',
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
  },
  callDriverButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callDriverText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
  },
  cancelRideButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelRideText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  // ─── Safety Modal Styles ───────────────────────────────────────────────────
  safetyModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  safetyModal: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  safetyModalHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  safetyModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  safetyModalSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  safetyModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: 280,
  },
  safetyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 10,
  },
  safetyContactPhone: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
  safetyRemoveBtn: {
    padding: 4,
  },
  safetyInputWrapper: {
    marginBottom: 12,
  },
  safetyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickContactText: {
    color: '#667eea',
    fontSize: 13,
    fontWeight: '600',
  },
  safetyInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  safetyAddBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  safetyAddBtnGradient: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  safetyHint: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  safetyModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  safetySkipBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  safetySkipText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  safetyConfirmBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  safetyConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  safetyConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  contactModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  contactModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  contactModalCloseBtn: {
    padding: 4,
  },
  contactSearchInput: {
    backgroundColor: '#f8fafc',
    margin: 20,
    padding: 12,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#1e293b',
  },
  contactListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactListAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactListInfo: {
    flex: 1,
  },
  contactListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  contactListPhone: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  // Payment Modal Styles
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  paymentModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  paymentModalHeader: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  paymentModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  paymentModalContent: {
    padding: 20,
  },
  paymentSuccessContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  paymentSuccessIcon: {
    marginBottom: 20,
  },
  paymentSuccessText: {
    fontSize: 18,
    color: '#1e293b',
    marginBottom: 10,
  },
  paymentSuccessAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentRideSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  paymentSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  paymentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 12,
    marginTop: 4,
  },
  paymentLocationLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e2e8f0',
    marginLeft: 5,
  },
  paymentLocationText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  paymentFareBreakdown: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  paymentFareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  paymentFareLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  paymentFareValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  paymentFareTotalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
  },
  paymentFareTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  paymentFareTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  paymentErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  paymentErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#f44336',
    marginLeft: 8,
  },
  paymentButtonsContainer: {
    marginTop: 8,
  },
  paymentPayButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  paymentButtonDisabled: {
    opacity: 0.7,
  },
  paymentPayButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  paymentPayButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  paymentSkipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  paymentSkipButtonText: {
    fontSize: 14,
    color: '#64748b',
    textDecorationLine: 'underline',
  },
  paymentSecureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  paymentSecureText: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 6,
  },
});

export default ConsumerHome;
