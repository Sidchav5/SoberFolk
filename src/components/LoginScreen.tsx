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
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-icons';

import { API_BASE_URL } from "../config/api";
const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<'Consumer' | 'Driver'>('Consumer');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
          email: emailOrPhone,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('currentUser', JSON.stringify(data.user));
        await AsyncStorage.setItem('userRole', role);

        Alert.alert(
          '🎉 Welcome Back!',
          `Glad to see you again, ${data.user.fullName}!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: role === 'Consumer' ? 'ConsumerHome' : 'DriverScreen' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
        setErrors({ general: data.error || 'Invalid credentials' });
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
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
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png' }} 
          style={styles.scooterImage}
          resizeMode="contain"
        />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.logoCircle}
            >
              <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png' }}
                style={styles.logoImage}
              />
            </LinearGradient>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your SoberFolks account</Text>
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'Consumer' && styles.roleButtonActive]}
              onPress={() => setRole('Consumer')}
              disabled={loading}
            >
              <Icon 
                name="person" 
                size={20} 
                color={role === 'Consumer' ? '#fff' : '#667eea'} 
                style={styles.roleIcon}
              />
              <Text style={[styles.roleText, role === 'Consumer' && styles.roleTextActive]}>
                Consumer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'Driver' && styles.roleButtonActive]}
              onPress={() => setRole('Driver')}
              disabled={loading}
            >
              <Icon 
                name="directions-car" 
                size={20} 
                color={role === 'Driver' ? '#fff' : '#667eea'} 
                style={styles.roleIcon}
              />
              <Text style={[styles.roleText, role === 'Driver' && styles.roleTextActive]}>
                Driver
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errors.general && (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={20} color="#dc2626" />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Input Fields */}
          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Icon name="email" size={20} color="#667eea" />
              <Text style={styles.label}>Phone or Email</Text>
            </View>
            <TextInput
              placeholder="Enter your phone or email"
              placeholderTextColor="#94a3b8"
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
            {errors.emailOrPhone && (
              <Text style={styles.errorText}>
                <Icon name="error" size={12} color="#dc2626" /> {errors.emailOrPhone}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Icon name="lock" size={20} color="#667eea" />
              <Text style={styles.label}>Password</Text>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                style={[styles.passwordInput, errors.password && styles.inputError]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError('password');
                  clearError('general');
                }}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon 
                  name={showPassword ? "visibility-off" : "visibility"} 
                  size={20} 
                  color="#94a3b8" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>
                <Icon name="error" size={12} color="#dc2626" /> {errors.password}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            disabled={loading}
            onPress={() => {
              Alert.alert(
                'Forgot Password?',
                'Password reset will be available soon. Please contact support.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={loading ? ['#94a3b8', '#64748b'] : ['#667eea', '#764ba2']}
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
                <>
                  <Text style={styles.loginText}>Sign In</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <View style={styles.socialLoginContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              disabled={loading}
              onPress={() => Alert.alert('Coming Soon', 'Google sign-in coming soon!')}
            >
              <Image 
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.socialIcon}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              disabled={loading}
              onPress={() => Alert.alert('Coming Soon', 'Facebook sign-in coming soon!')}
            >
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
              <Text style={styles.signupLink}> Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

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
    backgroundColor: 'transparent',
  },
  scooterImage: {
    position: 'absolute',
    width: 180,
    height: 180,
    bottom: 40,
    right: -40,
    opacity: 0.06,
    transform: [{ rotate: '-15deg' }],
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImage: {
    width: 45,
    height: 45,
    tintColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: '#64748b',
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 60,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 60,
    backgroundColor: 'transparent',
    gap: 8,
    flex: 1,
  },
  roleButtonActive: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  roleIcon: {
    marginRight: 4,
  },
  roleText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  generalErrorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 60,
    gap: 8,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  socialIcon: {
    width: 28,
    height: 28,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  signupLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '700',
  },
});
