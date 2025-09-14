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
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',  // Coral border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
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
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconInner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: '#6E44FF', // Purple tint
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -20,
    right: 20,
    zIndex: -1,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    bottom: 10,
    left: 40,
    zIndex: -1,
  },
  textSection: {
    flex: 0.3,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    color: '#666666',  // Dark gray text
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  nextButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    minWidth: 200,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  nextButtonIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;