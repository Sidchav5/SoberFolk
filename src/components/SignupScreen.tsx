import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-icons';
import {
  launchImageLibrary,
  ImagePickerResponse,
  ImageLibraryOptions,
} from 'react-native-image-picker';

import { API_BASE_URL } from "../config/api";
const { width, height } = Dimensions.get('window');

const SignupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<'Consumer' | 'Driver'>('Consumer');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    dateOfBirth: '',
    address: '',
    aadharNumber: '',
    licenseNumber: '',
    scooterModel: '',
  });
  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhoneNumberChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 10) updateFormData('phoneNumber', digitsOnly);
  };

  const handleAadharChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 12) updateFormData('aadharNumber', digitsOnly);
  };

  const handleLicenseChange = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 15) updateFormData('licenseNumber', cleaned);
  };

  const handleDateChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    let formattedDate = digitsOnly;

    if (digitsOnly.length >= 3) {
      formattedDate = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
    }
    if (digitsOnly.length >= 5) {
      formattedDate = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    }

    updateFormData('dateOfBirth', formattedDate);
  };

  const calculateAge = (dateString: string) => {
    const [day, month, year] = dateString.split('/').map(Number);
    if (!day || !month || !year || year < 1900 || year > new Date().getFullYear()) return -1;

    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const selectProfilePhoto = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as const,
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
      includeBase64: true,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (!response.didCancel && !response.errorMessage && response.assets) {
        const asset = response.assets[0];
        if (asset.uri) {
          setProfilePhoto(`data:${asset.type};base64,${asset.base64}`);
          if (errors.profilePhoto) {
            setErrors(prev => ({ ...prev, profilePhoto: '' }));
          }
        }
      }
    });
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    else if (formData.phoneNumber.length !== 10) newErrors.phoneNumber = 'Phone number must be 10 digits';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    else {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 18) newErrors.dateOfBirth = 'You must be at least 18 years old';
      else if (age === -1) newErrors.dateOfBirth = 'Enter valid date (DD/MM/YYYY)';
    }

    if (!gender) newErrors.gender = 'Please select your gender';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    if (role === 'Consumer') {
      if (!formData.aadharNumber) newErrors.aadharNumber = 'Aadhar number is required';
      else if (!/^[2-9][0-9]{11}$/.test(formData.aadharNumber)) newErrors.aadharNumber = 'Enter a valid 12-digit Aadhar number';
    }

    if (role === 'Driver') {
      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
      else if (!/^[A-Z]{2}[0-9]{13}$/.test(formData.licenseNumber)) newErrors.licenseNumber = 'Invalid format (e.g. MH1220110001234)';
      if (!formData.aadharNumber) newErrors.aadharNumber = 'Government ID (Aadhar) is required';
      else if (!/^[2-9][0-9]{11}$/.test(formData.aadharNumber)) newErrors.aadharNumber = 'Enter a valid 12-digit Aadhar number';
      if (!formData.scooterModel.trim()) newErrors.scooterModel = 'Scooter model is required';
    }

    if (!profilePhoto) newErrors.profilePhoto = 'Profile photo is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const signupData = {
        role,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        gender,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        aadharNumber: formData.aadharNumber,
        licenseNumber: formData.licenseNumber || null,
        scooterModel: formData.scooterModel || null,
        profilePhoto,
      };

      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          '🎉 Success!',
          'Account created successfully! Welcome to SoberFolks.',
          [{ text: 'Sign In', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Error', data.error || 'Something went wrong');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
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
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.logoCircle}
            >
              <Icon name="person-add" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our community for safe rides</Text>
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

          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <View style={styles.sectionHeader}>
              <Icon name="photo-camera" size={20} color="#667eea" />
              <Text style={styles.sectionLabel}>Profile Photo</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TouchableOpacity 
              style={styles.photoButton} 
              onPress={selectProfilePhoto}
              disabled={loading}
              activeOpacity={0.8}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="add-a-photo" size={40} color="#667eea" />
                  <Text style={styles.photoButtonText}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.profilePhoto && (
              <View style={styles.errorContainer}>
                <Icon name="error-outline" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{errors.profilePhoto}</Text>
              </View>
            )}
          </View>

          {/* Personal Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="person-outline" size={22} color="#667eea" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="badge" size={18} color="#667eea" />
                <Text style={styles.label}>Full Name</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                value={formData.fullName}
                onChangeText={text => updateFormData('fullName', text)}
                editable={!loading}
              />
              {errors.fullName && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="wc" size={18} color="#667eea" />
                <Text style={styles.label}>Gender</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderButton, gender === g && styles.genderButtonActive]}
                    onPress={() => setGender(g as 'Male' | 'Female' | 'Other')}
                    disabled={loading}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.gender}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="phone" size={18} color="#667eea" />
                <Text style={styles.label}>Phone Number</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                placeholder="10-digit phone number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={formData.phoneNumber}
                onChangeText={handlePhoneNumberChange}
                maxLength={10}
                editable={!loading}
              />
              {errors.phoneNumber && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="email" size={18} color="#667eea" />
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={text => updateFormData('email', text)}
                autoCapitalize="none"
                editable={!loading}
              />
              {errors.email && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="lock" size={18} color="#667eea" />
                <Text style={styles.label}>Password</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Create a password (min 6 characters)"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={text => updateFormData('password', text)}
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
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="cake" size={18} color="#667eea" />
                <Text style={styles.label}>Date of Birth</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.dateOfBirth && styles.inputError]}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={formData.dateOfBirth}
                onChangeText={handleDateChange}
                maxLength={10}
                editable={!loading}
              />
              {errors.dateOfBirth && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="home" size={18} color="#667eea" />
                <Text style={styles.label}>Address</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea, errors.address && styles.inputError]}
                placeholder="Your complete address"
                placeholderTextColor="#94a3b8"
                value={formData.address}
                onChangeText={text => updateFormData('address', text)}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
              {errors.address && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.address}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Verification Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="verified" size={22} color="#667eea" />
              <Text style={styles.sectionTitle}>Verification Documents</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Icon name="credit-card" size={18} color="#667eea" />
                <Text style={styles.label}>Aadhar Number</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.aadharNumber && styles.inputError]}
                placeholder="12-digit Aadhar number"
                placeholderTextColor="#94a3b8"
                value={formData.aadharNumber}
                onChangeText={handleAadharChange}
                keyboardType="numeric"
                maxLength={12}
                editable={!loading}
              />
              {errors.aadharNumber && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{errors.aadharNumber}</Text>
                </View>
              )}
            </View>

            {role === 'Driver' && (
              <>
                <View style={styles.inputGroup}>
                  <View style={styles.inputHeader}>
                    <Icon name="assignment" size={18} color="#667eea" />
                    <Text style={styles.label}>License Number</Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                  <TextInput
                    style={[styles.input, errors.licenseNumber && styles.inputError]}
                    placeholder="e.g. MH1220110001234"
                    placeholderTextColor="#94a3b8"
                    value={formData.licenseNumber}
                    onChangeText={handleLicenseChange}
                    autoCapitalize="characters"
                    maxLength={15}
                    editable={!loading}
                  />
                  {errors.licenseNumber && (
                    <View style={styles.errorContainer}>
                      <Icon name="error-outline" size={14} color="#dc2626" />
                      <Text style={styles.errorText}>{errors.licenseNumber}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputHeader}>
                    <Icon name="two-wheeler" size={18} color="#667eea" />
                    <Text style={styles.label}>Scooter Model</Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                  <TextInput
                    style={[styles.input, errors.scooterModel && styles.inputError]}
                    placeholder="Your scooter model"
                    placeholderTextColor="#94a3b8"
                    value={formData.scooterModel}
                    onChangeText={text => updateFormData('scooterModel', text)}
                    editable={!loading}
                  />
                  {errors.scooterModel && (
                    <View style={styles.errorContainer}>
                      <Icon name="error-outline" size={14} color="#dc2626" />
                      <Text style={styles.errorText}>{errors.scooterModel}</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Signup Button */}
          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.disabledButton]} 
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={loading ? ['#94a3b8', '#64748b'] : ['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signupGradient}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.loadingText}>Creating Account...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.signupText}>Create Account</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Redirect */}
          <View style={styles.loginRedirect}>
            <Text style={styles.redirectText}>Already have an account?</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.link}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupScreen;

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
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
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
  photoSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '600',
    marginTop: 8,
  },
  profileImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8,
  },
  requiredStar: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
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
    borderWidth: 0,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  genderTextActive: {
    color: '#fff',
  },
  signupButton: {
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  signupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 60,
    gap: 8,
  },
  signupText: {
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
  loginRedirect: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  redirectText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  link: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '700',
  },
});
