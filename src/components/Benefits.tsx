import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageStyle, ViewStyle, TextStyle, Animated } from 'react-native';
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
    icon: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    gradient: ['#FF6B6B', '#6E44FF'],
    iconBg: '#FF6B6B'
  },
  { 
    text: "Dynamic Pricing", 
    description: "Fair and transparent pricing based on distance, time, and traffic conditions",
    icon: "https://cdn-icons-png.flaticon.com/512/1728/1728450.png",
    gradient: ['#FF8A8A', '#8A6EFF'],
    iconBg: '#FF8A8A'
  },
  { 
    text: "Driver Flexibility", 
    description: "Drivers use their own foldable electric scooters for faster, eco-friendly trips",
    icon: "https://cdn-icons-png.flaticon.com/512/5105/5105607.png",
    gradient: ['#FF6B6B', '#8A6EFF'],
    iconBg: '#FF6B6B'
  },
  { 
    text: "Secure Payments", 
    description: "Seamless and safe cashless transactions integrated into the platform",
    icon: "https://cdn-icons-png.flaticon.com/512/6296/6296371.png",
    gradient: ['#FF6B6B', '#6E44FF'],
    iconBg: '#FF6B6B'
  },
];

const Benefits: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.backgroundDecor}>
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
      </View>

      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerBadge}>
          <LinearGradient
            colors={['#FF6B6B', '#6E44FF']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.badgeGradient}
          >
            <Text style={styles.badgeText}>✨ WHY CHOOSE US</Text>
          </LinearGradient>
        </View>
        
        <Text style={styles.heading}>Why Choose{'\n'}SoberFolks?</Text>
        <Text style={styles.subheading}>
          Experience seamless urban mobility with our{'\n'}eco-friendly scooter service
        </Text>
        
        <View style={styles.headerLineContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#6E44FF']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.headerLine}
          />
        </View>
      </View>

      {/* Benefits Grid */}
      <View style={styles.benefitsGrid}>
        {benefits.map((benefit, index) => (
          <View 
            key={index} 
            style={[
              styles.cardWrapper,
              { marginTop: index === 0 ? 0 : 20 }
            ]}
          >
            {/* Glassmorphism Card */}
            <View style={styles.cardShadow}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(248, 251, 248, 0.95)']}
                style={styles.card}
              >
                {/* Decorative Pattern */}
                <View style={styles.cardPattern}>
                  <View style={[styles.patternCircle, { backgroundColor: benefit.iconBg + '08' }]} />
                  <View style={[styles.patternCircle2, { backgroundColor: benefit.iconBg + '05' }]} />
                </View>

                {/* Animated Icon Container */}
                <View style={styles.iconWrapper}>
                  <View style={[styles.iconOuterRing, { borderColor: benefit.iconBg + '30' }]} />
                  <View style={[styles.iconContainer, { backgroundColor: benefit.iconBg + '15' }]}>
                    <LinearGradient
                      colors={benefit.gradient}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.iconGradient}
                    >
                      <View style={styles.iconInnerGlow}>
                        <Image 
                          source={{ uri: benefit.icon }} 
                          style={styles.iconImage}
                          resizeMode="contain"
                        />
                      </View>
                    </LinearGradient>
                  </View>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{benefit.text}</Text>
                  <Text style={styles.cardDescription}>{benefit.description}</Text>
                </View>

                {/* Card Number Badge */}
                <View style={styles.cardNumberBadge}>
                  <LinearGradient
                    colors={[benefit.iconBg + '20', benefit.iconBg + '10']}
                    style={styles.numberBadgeGradient}
                  >
                    <Text style={[styles.numberBadgeText, { color: benefit.iconBg }]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Bottom Accent Line */}
                <View style={styles.cardAccent}>
                  <LinearGradient
                    colors={benefit.gradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.accentLine}
                  />
                </View>
              </LinearGradient>
            </View>
          </View>
        ))}
      </View>

      {/* Enhanced CTA Section */}
      <View style={styles.ctaContainer}>
        <LinearGradient
          colors={['#FF6B6B', '#6E44FF']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.ctaGradient}
        >
          {/* CTA Pattern */}
          <View style={styles.ctaPattern}>
            <View style={styles.ctaPatternCircle1} />
            <View style={styles.ctaPatternCircle2} />
            <View style={styles.ctaPatternCircle3} />
          </View>

          {/* CTA Content */}
          <View style={styles.ctaContent}>
            <View style={styles.ctaIconRow}>
              <View style={styles.ctaIconDot} />
              <Text style={styles.ctaEmoji}>🚀</Text>
              <View style={styles.ctaIconDot} />
            </View>
            
            <Text style={styles.ctaText}>Ready to ride on demand?</Text>
            <Text style={styles.ctaSubtext}>
              Experience the convenience of instant scooter rides{'\n'}across the city
            </Text>

            {/* CTA Stats */}
            <View style={styles.ctaStats}>
              <View style={styles.ctaStat}>
                <Text style={styles.ctaStatNumber}>1000+</Text>
                <Text style={styles.ctaStatLabel}>Happy Riders</Text>
              </View>
              <View style={styles.ctaStatDivider} />
              <View style={styles.ctaStat}>
                <Text style={styles.ctaStatNumber}>500+</Text>
                <Text style={styles.ctaStatLabel}>Active Drivers</Text>
              </View>
              <View style={styles.ctaStatDivider} />
              <View style={styles.ctaStat}>
                <Text style={styles.ctaStatNumber}>24/7</Text>
                <Text style={styles.ctaStatLabel}>Available</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create<{
  container: ViewStyle;
  backgroundDecor: ViewStyle;
  decorCircle: ViewStyle;
  decorCircle1: ViewStyle;
  decorCircle2: ViewStyle;
  decorCircle3: ViewStyle;
  headerContainer: ViewStyle;
  headerBadge: ViewStyle;
  badgeGradient: ViewStyle;
  badgeText: TextStyle;
  heading: TextStyle;
  subheading: TextStyle;
  headerLineContainer: ViewStyle;
  headerLine: ViewStyle;
  benefitsGrid: ViewStyle;
  cardWrapper: ViewStyle;
  cardShadow: ViewStyle;
  card: ViewStyle;
  cardPattern: ViewStyle;
  patternCircle: ViewStyle;
  patternCircle2: ViewStyle;
  iconWrapper: ViewStyle;
  iconOuterRing: ViewStyle;
  iconContainer: ViewStyle;
  iconGradient: ViewStyle;
  iconInnerGlow: ViewStyle;
  iconImage: ImageStyle;
  cardContent: ViewStyle;
  cardTitle: TextStyle;
  cardDescription: TextStyle;
  cardNumberBadge: ViewStyle;
  numberBadgeGradient: ViewStyle;
  numberBadgeText: TextStyle;
  cardAccent: ViewStyle;
  accentLine: ViewStyle;
  ctaContainer: ViewStyle;
  ctaGradient: ViewStyle;
  ctaPattern: ViewStyle;
  ctaPatternCircle1: ViewStyle;
  ctaPatternCircle2: ViewStyle;
  ctaPatternCircle3: ViewStyle;
  ctaContent: ViewStyle;
  ctaIconRow: ViewStyle;
  ctaIconDot: ViewStyle;
  ctaEmoji: TextStyle;
  ctaText: TextStyle;
  ctaSubtext: TextStyle;
  ctaStats: ViewStyle;
  ctaStat: ViewStyle;
  ctaStatNumber: TextStyle;
  ctaStatLabel: TextStyle;
  ctaStatDivider: ViewStyle;
}>({
  container: {
    padding: 20,
    backgroundColor: '#F8FBF8',
    position: 'relative',
  },
  backgroundDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.05,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    backgroundColor: '#FF6B6B',
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    backgroundColor: '#6E44FF',
    top: '40%',
    left: -80,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    backgroundColor: '#FF8A8A',
    bottom: 100,
    right: -50,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  headerBadge: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 12,
    color: '#2D3436',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 38,
  },
  subheading: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  headerLineContainer: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerLine: {
    width: 80,
    height: 5,
    borderRadius: 4,
  },
  benefitsGrid: {
    marginBottom: 30,
  },
  cardWrapper: {
    paddingHorizontal: 0,
  },
  cardShadow: {
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    borderRadius: 28,
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(110, 68, 255, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 200,
  },
  patternCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -50,
    right: -30,
  },
  patternCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: 20,
    right: -20,
  },
  iconWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  iconOuterRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    padding: 4,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconInnerGlow: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 32,
    height: 32,
    tintColor: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  cardDescription: {
    fontSize: 15,
    color: '#636E72',
    lineHeight: 23,
    fontWeight: '500',
  },
  cardNumberBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  numberBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  numberBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  accentLine: {
    flex: 1,
  },
  ctaContainer: {
    marginTop: 10,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 15,
  },
  ctaGradient: {
    padding: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  ctaPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  ctaPatternCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -80,
    right: -60,
  },
  ctaPatternCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: -40,
    left: -30,
  },
  ctaPatternCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: '50%',
    right: 40,
  },
  ctaContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  ctaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaIconDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 8,
  },
  ctaEmoji: {
    fontSize: 28,
  },
  ctaText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  ctaSubtext: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    fontWeight: '500',
  },
  ctaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ctaStat: {
    alignItems: 'center',
    flex: 1,
  },
  ctaStatNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  ctaStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctaStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});

export default Benefits;