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
    minHeight: 520,
    position: 'relative',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    top: -100,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(110, 68, 255, 0.15)',
    bottom: -75,
    left: -30,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 158, 158, 0.2)',
    top: 100,
    left: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  imageBorder: {
    padding: 2,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  imageGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(110, 68, 255, 0.1)',
    top: -4,
    left: -4,
    zIndex: -1,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#2D3436',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: 1,
  },
  titleAccent: {
    fontWeight: '800',
    fontSize: 36,
    color: '#6E44FF',
    textShadowColor: 'rgba(110, 68, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
    paddingHorizontal: 20,
  },
  subtitleLine: {
    height: 1,
    backgroundColor: 'rgba(110, 68, 255, 0.3)',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
    marginHorizontal: 15,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 10,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    minWidth: 220,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttonIcon: {
    marginLeft: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HeroSection;