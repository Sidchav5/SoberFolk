// OTPInput.tsx - Input OTP code for verification
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '@react-native-vector-icons/material-icons';

const { width } = Dimensions.get('window');

interface OTPInputProps {
  title: string;
  subtitle?: string;
  onVerify: (otp: string) => Promise<void>;
  loading?: boolean;
  error?: string;
  attempts?: number;
  maxAttempts?: number;
}

const OTPInput: React.FC<OTPInputProps> = ({ 
  title, 
  subtitle, 
  onVerify, 
  loading = false,
  error,
  attempts = 0,
  maxAttempts = 5
}) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [shakeAnim] = useState(new Animated.Value(0));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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

    // Auto-focus first input when component mounts
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  // Auto-clear OTP when error changes (new error means failed attempt)
  useEffect(() => {
    if (error) {
      // Shake animation on error
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      // Clear after a short delay so user can see what they entered
      const timer = setTimeout(() => {
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (text: string, index: number) => {
    // Only allow digits
    if (text && !/^\d$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits are entered
    if (text && index === 3 && newOtp.every(digit => digit !== '') && !loading) {
      const otpCode = newOtp.join('');
      onVerify(otpCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const otpCode = otp.join('');
    if (otpCode.length === 4 && !loading) {
      onVerify(otpCode);
    }
  };

  const clearOTP = () => {
    setOtp(['', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every(digit => digit !== '');
  const remainingAttempts = maxAttempts - attempts;

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
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Icon name="lock" size={24} color="#fff" />
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      
      {/* Attempts Counter */}
      {attempts > 0 && (
        <View style={[
          styles.attemptsContainer,
          attempts >= maxAttempts && styles.attemptsContainerDanger
        ]}>
          <Icon 
            name={attempts >= maxAttempts ? "warning" : "info"} 
            size={16} 
            color={attempts >= maxAttempts ? "#ef4444" : "#f59e0b"} 
          />
          <Text style={[
            styles.attemptsText,
            attempts >= maxAttempts && styles.attemptsTextDanger
          ]}>
            {attempts >= maxAttempts 
              ? 'Maximum attempts reached. Please contact support.'
              : `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`
            }
          </Text>
        </View>
      )}
      
      {/* OTP Input Fields */}
      <Animated.View style={[styles.otpContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              digit !== '' && styles.otpInputFilled,
              error && styles.otpInputError,
            ]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!loading && attempts < maxAttempts}
            placeholderTextColor="#cbd5e1"
          />
        ))}
      </Animated.View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearOTP}
          disabled={loading || attempts >= maxAttempts}
          activeOpacity={0.7}
        >
          <Icon name="refresh" size={18} color="#64748b" />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button, 
            styles.verifyButton,
            (!isComplete || loading || attempts >= maxAttempts) && styles.buttonDisabled
          ]}
          onPress={handleVerify}
          disabled={!isComplete || loading || attempts >= maxAttempts}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={(!isComplete || loading) ? ['#94a3b8', '#64748b'] : ['#667eea', '#764ba2']}
            style={styles.verifyButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="check-circle" size={18} color="#fff" />
                <Text style={styles.verifyButtonText}>Verify</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Hint Text */}
      <View style={styles.hintContainer}>
        <Icon name="info-outline" size={14} color="#94a3b8" />
        <Text style={styles.hintText}>
          Enter the 4-digit OTP shared by the {title.toLowerCase().includes('pickup') ? 'driver' : 'consumer'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
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
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  attemptsContainerDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  attemptsText: {
    fontSize: 12,
    color: '#d97706',
    textAlign: 'center',
    fontWeight: '600',
  },
  attemptsTextDanger: {
    color: '#dc2626',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 65,
    height: 75,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    color: '#1e293b',

  },
  otpInputFilled: {
    borderColor: '#667eea',
    backgroundColor: '#f5f3ff',
    color: '#667eea',
  },
  otpInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    borderRadius: 50,
    overflow: 'hidden',
  },
  clearButton: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clearButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButton: {
    overflow: 'hidden',
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  hintText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default OTPInput;
