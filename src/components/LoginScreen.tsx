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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<'Consumer' | 'Driver'>('Consumer');
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>

        <Text style={styles.title}>Login</Text>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'Consumer' && styles.roleButtonActive]}
            onPress={() => setRole('Consumer')}
          >
            <Text style={[styles.roleText, role === 'Consumer' && styles.roleTextActive]}>Consumer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'Driver' && styles.roleButtonActive]}
            onPress={() => setRole('Driver')}
          >
            <Text style={[styles.roleText, role === 'Driver' && styles.roleTextActive]}>Driver</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <Text style={styles.label}>Phone or Email</Text>
        <TextInput
          placeholder="Enter your phone or email"
          placeholderTextColor="#666"
          style={styles.input}
          value={emailOrPhone}
          onChangeText={setEmailOrPhone}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor="#666"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton}>
          <LinearGradient
            colors={['#FF6B6B', '#6E44FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loginGradient}
          >
            <Text style={styles.loginText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login Options */}
        <View style={styles.socialLoginContainer}>
          <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} 
              style={styles.socialIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, styles.facebookButton]}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/733/733547.png' }} 
              style={styles.socialIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Signup Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>New to SoberFolks?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}> Create an account</Text>
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
    marginBottom: 30,
    textShadowColor: 'rgba(110, 68, 255, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#E8E6FF',
    borderWidth: 2,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#000',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
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
    fontSize: 14,
    color: '#555',
  },
  signupLink: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});