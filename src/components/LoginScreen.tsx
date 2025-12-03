import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Configuration
// Try multiple IPs for local network flexibility
const API_URLS = [
  "http://192.168.1.2:5000",    // New IP
  "http://10.139.99.126:5000",  // Original IP
  "http://10.219.191.57:5000",
];

const API_BASE_URL = "https://soberfolks-backend-production.up.railway.app"; // For local development

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<'Consumer' | 'Driver'>('Consumer');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateInputs = () => {
    const newErrors: {[key: string]: string} = {};

    if (!emailOrPhone.trim()) {
      newErrors.emailOrPhone = 'Email or phone number is required';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
  if (!validateInputs()) return;

  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        email: emailOrPhone, // Backend will check both email and phone
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // ✅ Save JWT token + user info
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('currentUser', JSON.stringify(data.user));
      await AsyncStorage.setItem('userRole', role);

      Alert.alert('Success', `Welcome back, ${data.user.fullName}!`, [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to appropriate dashboard
            navigation.reset({
              index: 0,
              routes: [{ name: role === 'Consumer' ? 'ConsumerHome' : 'DriverScreen' }],
            });
          }
        }
      ]);
    } else {
      Alert.alert('Login Failed', data.error || 'Invalid credentials');
      setErrors({ general: data.error || 'Invalid credentials' });
    }
  } catch (error) {
    Alert.alert('Error', 'Network error. Please check your connection and try again.');
    console.error('Login error:', error);
    setErrors({ general: 'Network error occurred' });
  } finally {
    setLoading(false);
  }
};


  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Elements */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
        
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png' }} 
          style={styles.scooterImage}
          resizeMode="contain"
        />
        
        <View style={styles.wavePattern} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your SoberFolks account</Text>

        

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'Consumer' && styles.roleButtonActive]}
            onPress={() => setRole('Consumer')}
            disabled={loading}
          >
            <Text style={[styles.roleText, role === 'Consumer' && styles.roleTextActive]}>
               Consumer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'Driver' && styles.roleButtonActive]}
            onPress={() => setRole('Driver')}
            disabled={loading}
          >
            <Text style={[styles.roleText, role === 'Driver' && styles.roleTextActive]}>
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {errors.general && (
          <View style={styles.errorContainer}>
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        {/* Inputs */}
        <Text style={styles.label}>Phone or Email *</Text>
        <TextInput
          placeholder="Enter your phone or email"
          placeholderTextColor="#666"
          style={[styles.input, errors.emailOrPhone && styles.inputError]}
          value={emailOrPhone}
          onChangeText={(text) => {
            setEmailOrPhone(text);
            clearError('emailOrPhone');
            clearError('general');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        {errors.emailOrPhone && <Text style={styles.errorText}>{errors.emailOrPhone}</Text>}

        <Text style={styles.label}>Password *</Text>
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor="#666"
          style={[styles.input, errors.password && styles.inputError]}
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            clearError('password');
            clearError('general');
          }}
          editable={!loading}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
          <Text style={[styles.forgotPasswordText, loading && styles.disabledText]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.disabledButton]} 
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#ccc', '#999'] : ['#FF6B6B', '#6E44FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loginGradient}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Signing In...</Text>
              </View>
            ) : (
              <Text style={styles.loginText}>Sign In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login Placeholder */}
        <View style={styles.socialLoginContainer}>
          <TouchableOpacity style={[styles.socialButton, styles.googleButton]} disabled={loading}>
            <Image 
              source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
              style={styles.socialIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, styles.facebookButton]} disabled={loading}>
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' }}
              style={styles.socialIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Signup Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>New to SoberFolks?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
          >
            <Text style={[styles.signupLink, loading && styles.disabledText]}>
              {' '}Create an account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;

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
    opacity: 0.08,
  },
  circle1: {
    width: 280,
    height: 280,
    backgroundColor: '#FF6B6B',
    top: -80,
    right: -80,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: '#6E44FF',
    bottom: 80,
    left: -50,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  circle3: {
    width: 140,
    height: 140,
    backgroundColor: '#FF8A8A',
    top: '40%',
    right: 10,
    shadowColor: '#FF8A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  scooterImage: {
    position: 'absolute',
    width: 140,
    height: 140,
    bottom: 60,
    right: 20,
    opacity: 0.08,
    transform: [{ rotate: '-15deg' }],
  },
  wavePattern: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#6E44FF',
    opacity: 0.05,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#6E44FF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(110, 68, 255, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 36,
    color: '#636E72',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 6,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(110, 68, 255, 0.08)',
  },
  roleButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    backgroundColor: 'transparent',
    marginHorizontal: 4,
    minWidth: 130,
  },
  roleButtonActive: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  roleText: {
    fontSize: 15,
    color: '#6E44FF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  roleTextActive: {
    color: '#fff',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  generalErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 15,
    color: '#6E44FF',
    marginBottom: 10,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderColor: '#E8E6FF',
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 18,
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '500',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: -14,
    marginBottom: 12,
    marginLeft: 6,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginButton: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 50,
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E8E6FF',
    borderRadius: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#636E72',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 16,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    backgroundColor: '#fff',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  googleButton: {
    borderWidth: 2,
    borderColor: '#E8E6FF',
  },
  facebookButton: {
    borderWidth: 2,
    borderColor: '#E8E6FF',
  },
  socialIcon: {
    width: 28,
    height: 28,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  signupText: {
    fontSize: 15,
    color: '#636E72',
    fontWeight: '500',
  },
  signupLink: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  disabledText: {
    opacity: 0.4,
  },
});