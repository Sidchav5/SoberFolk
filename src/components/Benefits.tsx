import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageStyle, ViewStyle, TextStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

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

const Benefits: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>Why Choose SoberFolks?</Text>
        <Text style={styles.subheading}>
          Experience seamless urban mobility with our eco-friendly scooter service
        </Text>
        <View style={styles.headerLine} />
      </View>

      {/* Benefits Grid */}
      <View style={styles.benefitsGrid}>
        {benefits.map((benefit, index) => (
          <View 
            key={index} 
            style={[
              styles.cardWrapper, 
              index % 2 === 1 ? styles.cardWrapperRight : undefined
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FBF8']}
              style={styles.card}
            >
              <View style={styles.cardPattern} />

              <View style={[styles.iconContainer, { backgroundColor: benefit.iconBg + '20' }]}>
                <LinearGradient
                  colors={benefit.gradient}
                  style={styles.iconGradient}
                >
                  <Image 
                    source={{ uri: benefit.icon }} 
                    style={styles.iconImage}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{benefit.text}</Text>
                <Text style={styles.cardDescription}>{benefit.description}</Text>
              </View>

              <View style={styles.cardDecor}>
                <View style={[styles.decorDot, { backgroundColor: benefit.iconBg }]} />
                <View style={[styles.decorDot, { backgroundColor: benefit.iconBg + '60' }]} />
                <View style={[styles.decorDot, { backgroundColor: benefit.iconBg + '30' }]} />
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* Bottom CTA Section */}
      <View style={styles.ctaContainer}>
        <LinearGradient
          colors={['#FF6B6B', '#6E44FF']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>Ready to ride on demand?</Text>
<Text style={styles.ctaSubtext}>Experience the convenience of instant scooter rides across the city</Text>

        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create<{
  container: ViewStyle;
  headerContainer: ViewStyle;
  heading: TextStyle;
  subheading: TextStyle;
  headerLine: ViewStyle;
  benefitsGrid: ViewStyle;
  cardWrapper: ViewStyle;
  cardWrapperRight: ViewStyle;
  card: ViewStyle;
  cardPattern: ViewStyle;
  iconContainer: ViewStyle;
  iconGradient: ViewStyle;
  iconImage: ImageStyle;
  cardContent: ViewStyle;
  cardTitle: TextStyle;
  cardDescription: TextStyle;
  cardDecor: ViewStyle;
  decorDot: ViewStyle;
  ctaContainer: ViewStyle;
  ctaGradient: ViewStyle;
  ctaText: TextStyle;
  ctaSubtext: TextStyle;
}>({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    color: '#6E44FF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  headerLine: {
    width: 60,
    height: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  benefitsGrid: {
    marginBottom: 30,
  },
  cardWrapper: {
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  cardWrapperRight: {
    alignItems: 'flex-end',
  },
  card: {
    width: width - 50,
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(110, 68, 255, 0.1)',
  },
  cardPattern: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    marginBottom: 20,
    padding: 3,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    fontWeight: '400',
  },
  cardDecor: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
  },
  decorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  ctaContainer: {
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    padding: 30,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Benefits;