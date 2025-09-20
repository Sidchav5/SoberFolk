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
const API_BASE_URL = __DEV__ 
  ? 'http://10.224.185.126:5000'  // Development
  : 'https://your-production-api.com';  // Production

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
    opacity: 0.15,
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
  scooterImage: {
    position: 'absolute',
    width: 120,
    height: 120,
    bottom: 50,
    right: 20,
    opacity: 0.7,
    transform: [{ rotate: '-15deg' }],
  },
  wavePattern: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#6E44FF',
    opacity: 0.1,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6E44FF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(110, 68, 255, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    fontWeight: '400',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 4,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
    backgroundColor: 'transparent',
    marginHorizontal: 5,
    minWidth: 120,
  },
  roleButtonActive: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  roleText: {
    fontSize: 16,
    color: '#6E44FF',
    fontWeight: '600',
    textAlign: 'center',
  },
  roleTextActive: {
    color: '#fff',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  generalErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  label: {
    fontSize: 16,
    color: '#6E44FF',
    marginBottom: 8,
    fontWeight: '600',
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#E8E6FF',
    borderWidth: 2,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 30,
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E6FF',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 25,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#E8E6FF',
  },
  facebookButton: {
    borderWidth: 1,
    borderColor: '#E8E6FF',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  signupText: {
    fontSize: 16,
    color: '#666',
  },
  signupLink: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
});