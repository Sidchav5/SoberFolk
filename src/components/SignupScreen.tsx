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
const API_BASE_URL = __DEV__ 
  ? 'http://10.28.44.126:5000'  // Development
  : 'https://your-production-api.com';  // Production

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
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: "#6E44FF",
    textShadowColor: 'rgba(110, 68, 255, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
    fontWeight: "400",
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 4,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roleButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 26,
    backgroundColor: "transparent",
    minWidth: 120,
  },
  roleButtonActive: {
    backgroundColor: "#6E44FF",
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  roleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6E44FF",
    textAlign: "center",
  },
  roleTextActive: {
    color: "#fff",
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#FF6B6B",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    marginTop: 8,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photoPlaceholder: {
    alignItems: "center",
  },
  photoPlaceholderText: {
    fontSize: 32,
    marginBottom: 4,
  },
  photoButtonText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  profileImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#6E44FF",
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "600",
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E8E6FF",
    alignItems: "center",
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  genderButtonActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  genderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  genderTextActive: {
    color: "#fff",
  },
  input: {
    borderWidth: 2,
    borderColor: "#E8E6FF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    color: "#333",
    fontSize: 16,
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: "#d32f2f",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: "#d32f2f",
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "500",
  },
  signupButton: {
    marginTop: 20,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#6E44FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  signupGradient: {
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: 30,
  },
  signupText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  loginRedirect: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  redirectText: {
    fontSize: 16,
    color: "#666",
  },
  link: {
    fontSize: 16,
    color: "#FF6B6B",
    fontWeight: "600",
  },
  disabledText: {
    opacity: 0.5,
  },
});