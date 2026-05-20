import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

type Benefit = {
  text: string;
  description: string;
  icon: string;
  gradient: string[];
  iconBg: string;
};

const benefits: Benefit[] = [
  { 
    text: "Efficient Navigation", 
    description: "Reach customers quickly with real-time routes and traffic-aware navigation",
    icon: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // Navigation icon
    gradient: ['#FF6B6B', '#6E44FF'], // Coral to purple gradient
    iconBg: '#FF6B6B'
  },
  { 
    text: "Dynamic Pricing", 
    description: "Fair and transparent pricing based on distance, time, and traffic conditions",
    icon: "https://cdn-icons-png.flaticon.com/512/1728/1728450.png", // Pricing icon from Flaticon
    gradient: ['#FF8A8A', '#8A6EFF'], // Lighter coral to lighter purple gradient
    iconBg: '#FF8A8A'
  },
  { 
    text: "Driver Flexibility", 
    description: "Drivers use their own foldable electric scooters for faster, eco-friendly trips",
    icon: "https://cdn-icons-png.flaticon.com/512/5105/5105607.png", // Scooter icon from Flaticon
    gradient: ['#FF6B6B', '#8A6EFF'], // Coral to medium purple gradient
    iconBg: '#FF6B6B'
  },
  { 
  text: "Secure Payments", 
  description: "Seamless and safe cashless transactions integrated into the platform",
  icon: "https://cdn-icons-png.flaticon.com/512/6296/6296371.png", // Secure payment icon from Flaticon
  gradient: ['#FF6B6B', '#6E44FF'], // Coral to purple gradient
  iconBg: '#FF6B6B'
  },
];


type OnboardingScreenProps = {
  onComplete: () => void;
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentScreen = benefits[currentIndex];
  const isLastScreen = currentIndex === benefits.length - 1;

  const handleNext = () => {
    if (isLastScreen) {
      onComplete();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Icon Section */}
        <View style={styles.iconSection}>
          <LinearGradient
            colors={currentScreen.gradient}
            style={styles.iconContainer}
          >
            <View style={styles.iconInner}>
              <Image 
                source={{ uri: currentScreen.icon }}
                style={styles.icon}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>

          {/* Decorative elements */}
          <View style={[styles.decorativeCircle1, { backgroundColor: currentScreen.gradient[0] + '30' }]} />
          <View style={[styles.decorativeCircle2, { backgroundColor: currentScreen.gradient[1] + '20' }]} />
        </View>

        {/* Text Content */}
        <View style={styles.textSection}>
          <Text style={[styles.subtitle, { color: currentScreen.gradient[0] }]}>
            {currentScreen.text}
          </Text>
          <Text style={styles.title}>{currentScreen.text}</Text>
          <Text style={styles.description}>{currentScreen.description}</Text>
        </View>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {benefits.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor: index === currentIndex ? currentScreen.gradient[0] : '#E5E5E5',
                  width: index === currentIndex ? 24 : 8,
                }
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={currentScreen.gradient}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {isLastScreen ? 'Get Started' : 'Next'}
              </Text>
              <View style={styles.nextButtonIcon}>
                <Text style={styles.nextButtonArrow}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create<{
  container: ViewStyle;
  skipButton: ViewStyle;
  skipText: TextStyle;
  content: ViewStyle;
  iconSection: ViewStyle;
  iconContainer: ViewStyle;
  iconInner: ViewStyle;
  icon: ImageStyle;
  decorativeCircle1: ViewStyle;
  decorativeCircle2: ViewStyle;
  textSection: ViewStyle;
  subtitle: TextStyle;
  title: TextStyle;
  description: TextStyle;
  progressContainer: ViewStyle;
  progressDot: ViewStyle;
  buttonContainer: ViewStyle;
  nextButton: ViewStyle;
  nextButtonGradient: ViewStyle;
  nextButtonText: TextStyle;
  nextButtonIcon: ViewStyle;
  nextButtonArrow: TextStyle;
}>({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#F8FBF8',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B6B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingBottom: 50,
  },
  iconSection: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 40,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    padding: 5,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 15,
  },
  iconInner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  icon: {
    width: 80,
    height: 80,
    tintColor: '#6E44FF',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -30,
    right: 10,
    zIndex: -1,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    bottom: 0,
    left: 30,
    zIndex: -1,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  textSection: {
    flex: 0.3,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.85,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 35,
    height: 16,
  },
  progressDot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  nextButton: {
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 50,
    minWidth: 220,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginRight: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  nextButtonIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  nextButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;