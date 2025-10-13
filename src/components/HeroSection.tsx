import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ImageSourcePropType } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const profileImage: ImageSourcePropType = require('../assets/images/SoberFolk.png');

const HeroSection: React.FC = () => {
   const navigation = useNavigation<any>();

  return (
    <LinearGradient 
      colors={['#FFFFFF', '#FFF0F5', '#E6E6FA']} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      
      <View style={styles.content}>
        {/* Profile Image with Enhanced Styling */}
        <View style={styles.imageContainer}>
          <View style={styles.imageBorder}>
            <Image source={profileImage} style={styles.image} />
          </View>
          <View style={styles.imageGlow} />
        </View>
        
        {/* Title with Better Typography */}
        <Text style={styles.title}>
          Welcome to{'\n'}
          <Text style={styles.titleAccent}>SoberFolks</Text>
        </Text>
        
        {/* Enhanced Subtitle */}
        <View style={styles.subtitleContainer}>
          <View style={styles.subtitleLine} />
          <Text style={styles.subtitle}>Get Ready for Reliable Ride !!</Text>
          <View style={styles.subtitleLine} />
        </View>
        
        {/* Enhanced CTA Button */}
        <TouchableOpacity 
      activeOpacity={0.85} 
      style={styles.buttonContainer}
      onPress={() => navigation.navigate('Login')} // Navigate to login
    >
      <LinearGradient
        colors={['#FF6B6B', '#6E44FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <Text style={styles.buttonText}>Begin Your Journey</Text>
        <View style={styles.buttonIcon}>
          <Text style={styles.buttonArrow}>→</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>

      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 580,
    position: 'relative',
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
    overflow: 'hidden',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 15,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    top: -120,
    right: -80,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(110, 68, 255, 0.12)',
    bottom: -90,
    left: -50,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 158, 158, 0.15)',
    top: 120,
    left: 10,
    shadowColor: '#FF9E9E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    zIndex: 1,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 36,
  },
  imageBorder: {
    padding: 4,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 18,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  imageGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(110, 68, 255, 0.15)',
    top: -6,
    left: -6,
    zIndex: -1,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '300',
    color: '#2D3436',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleAccent: {
    fontWeight: '900',
    fontSize: 40,
    color: '#6E44FF',
    textShadowColor: 'rgba(110, 68, 255, 0.25)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    paddingHorizontal: 16,
    width: '100%',
  },
  subtitleLine: {
    height: 2,
    backgroundColor: 'rgba(110, 68, 255, 0.25)',
    flex: 1,
    borderRadius: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    fontStyle: 'italic',
    textShadowColor: 'rgba(255, 107, 107, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonContainer: {
    marginTop: 16,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 15,
    borderRadius: 60,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 60,
    minWidth: 260,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  buttonIcon: {
    marginLeft: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});
export default HeroSection;