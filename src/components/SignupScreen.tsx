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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';

// Configuration
// Try multiple IPs for local network flexibility
const API_URLS = [
  "http://192.168.56.1:5000",    // New IP
  "http://10.139.99.126:5000",  // Original IP
  "http://10.219.191.57:5000",
];

const API_BASE_URL = "http://10.139.99.126:5000"; // For local development
const { width, height } = Dimensions.get('window');

const SignupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<'Consumer' | 'Driver'>('Consumer');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [loading, setLoading] = useState(false);
  
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
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
      includeBase64: true, // Include base64 for API upload
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
      else if (formData.aadharNumber.length !== 12) newErrors.aadharNumber = 'Aadhar number must be 12 digits';
    }

    if (role === 'Driver') {
      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
      if (!formData.aadharNumber) newErrors.aadharNumber = 'Government ID (Aadhar) is required';
      else if (formData.aadharNumber.length !== 12) newErrors.aadharNumber = 'Aadhar number must be 12 digits';
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
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create your SoberFolks account</Text>
        <Text style={styles.subtitle}>Join our community for safe rides</Text>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          {['Consumer', 'Driver'].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleButton, role === r && styles.roleButtonActive]}
              onPress={() => setRole(r as 'Consumer' | 'Driver')}
              disabled={loading}
            >
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {r === 'Consumer' ? ' Consumer' : ' Driver'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Profile Photo *</Text>
          <TouchableOpacity 
            style={styles.photoButton} 
            onPress={selectProfilePhoto}
            disabled={loading}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>📷</Text>
                <Text style={styles.photoButtonText}>Tap to select photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {errors.profilePhoto && <Text style={styles.errorText}>{errors.profilePhoto}</Text>}
        </View>

        {/* Form Fields */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={[styles.input, errors.fullName && styles.inputError]}
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={text => updateFormData('fullName', text)}
            editable={!loading}
          />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

          <Text style={styles.label}>Gender *</Text>
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
          {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={[styles.input, errors.phoneNumber && styles.inputError]}
            placeholder="10-digit phone number"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={handlePhoneNumberChange}
            maxLength={10}
            editable={!loading}
          />
          {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Email address"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={text => updateFormData('email', text)}
            autoCapitalize="none"
            editable={!loading}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Password (min 6 characters)"
            secureTextEntry
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            editable={!loading}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <Text style={styles.label}>Date of Birth *</Text>
          <TextInput
            style={[styles.input, errors.dateOfBirth && styles.inputError]}
            placeholder="DD/MM/YYYY"
            keyboardType="numeric"
            value={formData.dateOfBirth}
            onChangeText={handleDateChange}
            maxLength={10}
            editable={!loading}
          />
          {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.address && styles.inputError]}
            placeholder="Complete address"
            value={formData.address}
            onChangeText={text => updateFormData('address', text)}
            multiline
            editable={!loading}
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

          {/* Role-specific Fields */}
          {role === 'Consumer' && (
            <>
              <Text style={styles.label}>Aadhar Number *</Text>
              <TextInput
                style={[styles.input, errors.aadharNumber && styles.inputError]}
                placeholder="12-digit Aadhar"
                value={formData.aadharNumber}
                onChangeText={handleAadharChange}
                keyboardType="numeric"
                maxLength={12}
                editable={!loading}
              />
              {errors.aadharNumber && <Text style={styles.errorText}>{errors.aadharNumber}</Text>}
            </>
          )}

          {role === 'Driver' && (
            <>
              <Text style={styles.label}>License Number *</Text>
              <TextInput
                style={[styles.input, errors.licenseNumber && styles.inputError]}
                placeholder="License number"
                value={formData.licenseNumber}
                onChangeText={text => updateFormData('licenseNumber', text)}
                editable={!loading}
              />
              {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}

              <Text style={styles.label}>Aadhar Number *</Text>
              <TextInput
                style={[styles.input, errors.aadharNumber && styles.inputError]}
                placeholder="12-digit Aadhar"
                value={formData.aadharNumber}
                onChangeText={handleAadharChange}
                keyboardType="numeric"
                maxLength={12}
                editable={!loading}
              />
              {errors.aadharNumber && <Text style={styles.errorText}>{errors.aadharNumber}</Text>}

              <Text style={styles.label}>Scooter Model *</Text>
              <TextInput
                style={[styles.input, errors.scooterModel && styles.inputError]}
                placeholder="Scooter model"
                value={formData.scooterModel}
                onChangeText={text => updateFormData('scooterModel', text)}
                editable={!loading}
              />
              {errors.scooterModel && <Text style={styles.errorText}>{errors.scooterModel}</Text>}
            </>
          )}
        </View>

        {/* Signup Button */}
        <TouchableOpacity 
          style={[styles.signupButton, loading && styles.disabledButton]} 
          onPress={handleSignup}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#ccc', '#999'] : ['#FF6B6B', '#6E44FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.signupGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signupText}>Create Account</Text>
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
            <Text style={[styles.link, loading && styles.disabledText]}> Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignupScreen;

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
    padding: 24,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
    color: "#6E44FF",
    letterSpacing: -0.5,
    textShadowColor: 'rgba(110, 68, 255, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 36,
    color: "#636E72",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 6,
    shadowColor: "#6E44FF",
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
    backgroundColor: "transparent",
    minWidth: 130,
    marginHorizontal: 4,
  },
  roleButtonActive: {
    backgroundColor: "#6E44FF",
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  roleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6E44FF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  roleTextActive: {
    color: "#fff",
    fontWeight: "800",
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  photoButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#FF6B6B",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    marginTop: 12,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  photoPlaceholder: {
    alignItems: "center",
  },
  photoPlaceholderText: {
    fontSize: 40,
    marginBottom: 6,
    
  },
  photoButtonText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginLeft:25,
    alignContent:"center",
  },
  profileImage: {
    width: 134,
    height: 134,
    borderRadius: 67,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: "#6E44FF",
    marginBottom: 10,
    marginTop: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E8E6FF",
    alignItems: "center",
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  genderButtonActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  genderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#636E72",
    letterSpacing: 0.3,
  },
  genderTextActive: {
    color: "#fff",
    fontWeight: "800",
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    borderWidth: 2,
    borderColor: "#E8E6FF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#fff",
    color: "#2D3436",
    fontSize: 15,
    fontWeight: '500',
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  inputError: {
    borderColor: "#d32f2f",
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  errorText: {
    fontSize: 12,
    color: "#d32f2f",
    marginTop: 6,
    marginLeft: 6,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  signupButton: {
    marginTop: 24,
    borderRadius: 50,
    overflow: "hidden",
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  disabledButton: {
    opacity: 0.6,
  },
  signupGradient: {
    paddingVertical: 20,
    alignItems: "center",
    borderRadius: 50,
  },
  signupText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loginRedirect: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  redirectText: {
    fontSize: 15,
    color: "#636E72",
    fontWeight: "500",
  },
  link: {
    fontSize: 15,
    color: "#FF6B6B",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  disabledText: {
    opacity: 0.4,
  },
});