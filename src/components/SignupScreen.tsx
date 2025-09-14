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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const SignupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<'Consumer' | 'Driver'>('Consumer');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  
  // Form state
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

  // Update form data
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Phone number validation (only digits, max 10)
  const handlePhoneNumberChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 10) {
      updateFormData('phoneNumber', digitsOnly);
    }
  };

  // Aadhar number validation (only digits, max 12)
  const handleAadharChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 12) {
      updateFormData('aadharNumber', digitsOnly);
    }
  };

  // Date formatting (DD/MM/YYYY)
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

  // Calculate age from DOB
  const calculateAge = (dateString: string) => {
    const [day, month, year] = dateString.split('/').map(Number);
    if (!day || !month || !year || year < 1900 || year > new Date().getFullYear()) {
      return -1;
    }
    
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Photo picker with proper typing
  const selectProfilePhoto = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
      includeBase64: false,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (!response.didCancel && !response.errorMessage) {
        if (response.assets && response.assets[0] && response.assets[0].uri) {
          setProfilePhoto(response.assets[0].uri);
          // Clear photo error if exists
          if (errors.profilePhoto) {
            setErrors(prev => ({ ...prev, profilePhoto: '' }));
          }
        }
      }
    });
  };

  // Form validation
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (formData.phoneNumber.length !== 10) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old to register';
      } else if (age === -1) {
        newErrors.dateOfBirth = 'Please enter a valid date (DD/MM/YYYY)';
      }
    }

    if (!gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (role === 'Consumer') {
      if (!formData.aadharNumber) {
        newErrors.aadharNumber = 'Aadhar number is required';
      } else if (formData.aadharNumber.length !== 12) {
        newErrors.aadharNumber = 'Aadhar number must be 12 digits';
      }
    }

    if (role === 'Driver') {
      if (!formData.licenseNumber.trim()) {
        newErrors.licenseNumber = 'License number is required';
      }
      if (!formData.aadharNumber) {
        newErrors.aadharNumber = 'Government ID (Aadhar) is required';
      } else if (formData.aadharNumber.length !== 12) {
        newErrors.aadharNumber = 'Aadhar number must be 12 digits';
      }
      if (!formData.scooterModel.trim()) {
        newErrors.scooterModel = 'Scooter model is required';
      }
    }

    if (!profilePhoto) {
      newErrors.profilePhoto = 'Profile photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle signup
  const handleSignup = () => {
    if (validateForm()) {
      // Process signup
      Alert.alert('Success', 'Account created successfully!');
      console.log('Form Data:', formData);
      console.log('Profile Photo:', profilePhoto);
      console.log('Role:', role);
      console.log('Gender:', gender);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background Elements */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
        
        {/* Scooter Illustration */}
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png' }} 
          style={styles.scooterImage}
          resizeMode="contain"
        />
        
        {/* Abstract Wave Pattern */}
        <View style={styles.wavePattern} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.title}>Create your SoberFolks account</Text>
        <Text style={styles.subtitle}>Join our community for safe rides</Text>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'Consumer' && styles.roleButtonActive]}
            onPress={() => setRole('Consumer')}
            activeOpacity={0.8}
          >
            <Text style={[styles.roleText, role === 'Consumer' && styles.roleTextActive]}>
              🛵 Consumer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'Driver' && styles.roleButtonActive]}
            onPress={() => setRole('Driver')}
            activeOpacity={0.8}
          >
            <Text style={[styles.roleText, role === 'Driver' && styles.roleTextActive]}>
              🏍️ Driver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Photo Selection */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Profile Photo *</Text>
          <TouchableOpacity style={styles.photoButton} onPress={selectProfilePhoto}>
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

        {/* Form Inputs */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            placeholder="Enter your full name"
            placeholderTextColor="#888"
            style={[styles.input, errors.fullName && styles.inputError]}
            value={formData.fullName}
            onChangeText={(text) => updateFormData('fullName', text)}
          />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'Male' && styles.genderButtonActive]}
              onPress={() => setGender('Male')}
              activeOpacity={0.8}
            >
              <Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'Female' && styles.genderButtonActive]}
              onPress={() => setGender('Female')}
              activeOpacity={0.8}
            >
              <Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>
                Female
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'Other' && styles.genderButtonActive]}
              onPress={() => setGender('Other')}
              activeOpacity={0.8}
            >
              <Text style={[styles.genderText, gender === 'Other' && styles.genderTextActive]}>
                Other
              </Text>
            </TouchableOpacity>
          </View>
          {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            placeholder="Enter 10-digit phone number"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            style={[styles.input, errors.phoneNumber && styles.inputError]}
            value={formData.phoneNumber}
            onChangeText={handlePhoneNumberChange}
            maxLength={10}
          />
          <Text style={styles.helperText}>Only digits allowed (10 digits required)</Text>
          {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

          <Text style={styles.label}>Email *</Text>
          <TextInput
            placeholder="Enter your email address"
            placeholderTextColor="#888"
            keyboardType="email-address"
            style={[styles.input, errors.email && styles.inputError]}
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>Password *</Text>
          <TextInput
            placeholder="Create a secure password"
            placeholderTextColor="#888"
            secureTextEntry
            style={[styles.input, errors.password && styles.inputError]}
            value={formData.password}
            onChangeText={(text) => updateFormData('password', text)}
          />
          <Text style={styles.helperText}>Minimum 6 characters required</Text>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <Text style={styles.label}>Date of Birth *</Text>
          <TextInput
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#888"
            style={[styles.input, errors.dateOfBirth && styles.inputError]}
            value={formData.dateOfBirth}
            onChangeText={handleDateChange}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.helperText}>Must be 18+ years old to register</Text>
          {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

          <Text style={styles.label}>Address *</Text>
          <TextInput
            placeholder="Enter your complete address"
            placeholderTextColor="#888"
            style={[styles.input, styles.textArea, errors.address && styles.inputError]}
            value={formData.address}
            onChangeText={(text) => updateFormData('address', text)}
            multiline
            numberOfLines={3}
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

          {/* Role Specific Inputs */}
          {role === 'Consumer' && (
            <>
              <Text style={styles.label}>Aadhar Number *</Text>
              <TextInput
                placeholder="Enter 12-digit Aadhar number"
                placeholderTextColor="#888"
                style={[styles.input, errors.aadharNumber && styles.inputError]}
                value={formData.aadharNumber}
                onChangeText={handleAadharChange}
                keyboardType="numeric"
                maxLength={12}
              />
              <Text style={styles.helperText}>Only digits allowed (12 digits required)</Text>
              {errors.aadharNumber && <Text style={styles.errorText}>{errors.aadharNumber}</Text>}
            </>
          )}

          {role === 'Driver' && (
            <>
              <Text style={styles.label}>Driver's License Number *</Text>
              <TextInput
                placeholder="Enter your license number"
                placeholderTextColor="#888"
                style={[styles.input, errors.licenseNumber && styles.inputError]}
                value={formData.licenseNumber}
                onChangeText={(text) => updateFormData('licenseNumber', text)}
              />
              {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}

              <Text style={styles.label}>Government ID Proof (Aadhar) *</Text>
              <TextInput
                placeholder="Enter 12-digit Aadhar number"
                placeholderTextColor="#888"
                style={[styles.input, errors.aadharNumber && styles.inputError]}
                value={formData.aadharNumber}
                onChangeText={handleAadharChange}
                keyboardType="numeric"
                maxLength={12}
              />
              <Text style={styles.helperText}>Only digits allowed (12 digits required)</Text>
              {errors.aadharNumber && <Text style={styles.errorText}>{errors.aadharNumber}</Text>}

              <Text style={styles.label}>Scooter Model *</Text>
              <TextInput
                placeholder="Enter your scooter model"
                placeholderTextColor="#888"
                style={[styles.input, errors.scooterModel && styles.inputError]}
                value={formData.scooterModel}
                onChangeText={(text) => updateFormData('scooterModel', text)}
              />
              {errors.scooterModel && <Text style={styles.errorText}>{errors.scooterModel}</Text>}
            </>
          )}
        </View>

        {/* Signup Button */}
        <TouchableOpacity style={styles.signupButton} onPress={handleSignup} activeOpacity={0.9}>
          <LinearGradient
            colors={['#FF6B6B', '#6E44FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.signupGradient}
          >
            <Text style={styles.signupText}>Create Account</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Login Redirect */}
        <View style={styles.loginRedirect}>
          <Text style={styles.redirectText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}> Sign In</Text>
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
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginLeft: 4,
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
});