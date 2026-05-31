// OTPDisplay.tsx - Display OTP code to show to the other party
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '@react-native-vector-icons/material-icons';

const { width } = Dimensions.get('window');

interface OTPDisplayProps {
  otp: string;
  title: string;
  subtitle?: string;
}

const OTPDisplay: React.FC<OTPDisplayProps> = ({ otp, title, subtitle }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for attention
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleCopy = () => {
    Alert.alert(
      'OTP Code',
      `Your OTP is: ${otp}\n\nPlease share this with the ${title.toLowerCase().includes('pickup') ? 'consumer' : 'driver'} at the ${title.toLowerCase().includes('pickup') ? 'pickup location' : 'drop location'}.`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Icon name="vpn-key" size={28} color="#fff" />
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      
      <TouchableOpacity 
        style={styles.otpContainer} 
        onPress={handleCopy}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.digitRow, { transform: [{ scale: pulseAnim }] }]}>
          {otp.split('').map((digit, index) => (
            <LinearGradient
              key={index}
              colors={['#f8fafc', '#ffffff']}
              style={styles.digitBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.digitText}>{digit}</Text>
            </LinearGradient>
          ))}
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.copyButton} 
        onPress={handleCopy}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.copyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="visibility" size={18} color="#fff" />
          <Text style={styles.copyButtonText}>Tap to View OTP</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginVertical: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#fff',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  otpContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  digitBox: {
    width: 60,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  digitText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#667eea',
    letterSpacing: 2,
  },
  copyButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default OTPDisplay;
