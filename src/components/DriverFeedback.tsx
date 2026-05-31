import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '@react-native-vector-icons/material-icons';

const { width } = Dimensions.get('window');
import { API_BASE_URL } from "../config/api";

const DriverFeedback: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { rideId, customerInfo, rideDetails } = route.params || {};

  // Ratings state
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [comments, setComments] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const positiveTags = [
    'Punctual pickup', 'Clear directions', 'Polite and respectful', 'Quick to respond',
    'Ready on time', 'Good communication', 'Patient', 'Friendly',
    'Pays on time', 'Appreciative'
  ];

  const negativeTags = [
    'Late for pickup', 'Unclear directions', 'Rude behavior', 'Slow to respond',
    'Not ready on time', 'Poor communication', 'Impatient', 'Disrespectful',
    'Payment issues', 'Demanding'
  ];

  const StarRating = ({ rating, onRatingChange, size = 36, label }: {
    rating: number; 
    onRatingChange: (r: number) => void; 
    size?: number; 
    label: string;
  }) => (
    <Animated.View style={[styles.ratingContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => onRatingChange(star)} 
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Icon 
              name={star <= rating ? "star" : "star-border"} 
              size={size} 
              color={star <= rating ? "#FFB800" : "#CBD5E1"} 
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>
        {rating > 0 ? `${rating}/5 - ${getRatingText(rating)}` : 'Tap to rate'}
      </Text>
    </Animated.View>
  );

  const getRatingText = (rating: number) => {
    switch(rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  const TagSelector = ({ tags, selectedTags, onTagToggle, isPositive = true }: {
    tags: string[];
    selectedTags: string[];
    onTagToggle: (tag: string) => void;
    isPositive?: boolean;
  }) => {
    const getTitle = () => isPositive ? 'What did the customer do well?' : 'What could the customer improve?';
    const getIcon = () => isPositive ? 'thumb-up' : 'thumb-down';
    const getColor = () => isPositive ? '#10b981' : '#ef4444';
    
    return (
      <Animated.View style={[styles.tagsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.tagsHeader}>
          <Icon name={getIcon()} size={24} color={getColor()} />
          <Text style={[styles.tagsTitle, isPositive && styles.positiveTagsTitle]}>{getTitle()}</Text>
        </View>
        <View style={styles.tagsGrid}>
          {tags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tag,
                selectedTags.includes(tag) && styles.selectedTag,
                isPositive ? styles.positiveTag : styles.negativeTag
              ]}
              onPress={() => onTagToggle(tag)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tagText, 
                selectedTags.includes(tag) && styles.selectedTagText,
                isPositive && !selectedTags.includes(tag) && styles.positiveTagText
              ]}>
                {tag}
              </Text>
              {selectedTags.includes(tag) && (
                <Icon name="check" size={14} color="#fff" style={styles.tagCheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmitFeedback = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating for the ride.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const feedbackData = {
        rideId,
        userType: 'driver',
        overallRating,
        cleanlinessRating: 0,
        safetyRating: 0,
        communicationRating,
        punctualityRating,
        comments: comments.trim(),
        tags: selectedTags,
        submittedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE_URL}/api/feedback/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(feedbackData)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert(
          'Feedback Submitted! 🎉', 
          'Thank you for your feedback. Your input helps us improve the experience for everyone.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Submission Failed', 'Unable to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated Background Elements */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
        <View style={styles.gridPattern} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <LinearGradient colors={['#fff', '#f8fafc']} style={styles.backButtonGradient}>
              <Icon name="arrow-back" size={24} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Customer</Text>
          <View style={styles.placeholder} />
        </Animated.View>

        {/* Ride Summary */}
        {rideDetails && (
          <Animated.View style={[styles.rideSummaryCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.rideSummaryGradient}
            >
              <View style={styles.rideSummaryHeader}>
                <Icon name="receipt" size={24} color="#fff" />
                <Text style={styles.rideSummaryTitle}>Ride Summary</Text>
              </View>
              <View style={styles.rideDetails}>
                <View style={styles.rideDetailRow}>
                  <Icon name="location-on" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.rideDetailLabel}>From:</Text>
                  <Text style={styles.rideDetailValue} numberOfLines={2}>{rideDetails.pickup}</Text>
                </View>
                <View style={styles.rideDetailRow}>
                  <Icon name="flag" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.rideDetailLabel}>To:</Text>
                  <Text style={styles.rideDetailValue} numberOfLines={2}>{rideDetails.drop}</Text>
                </View>
                <View style={styles.rideDetailRow}>
                  <Icon name="currency-rupee" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.rideDetailLabel}>Fare:</Text>
                  <Text style={styles.rideDetailValue}>₹{rideDetails.fare}</Text>
                </View>
                <View style={styles.rideDetailRow}>
                  <Icon name="event" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.rideDetailLabel}>Date:</Text>
                  <Text style={styles.rideDetailValue}>{rideDetails.date}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Customer Info */}
        {customerInfo && (
          <Animated.View style={[styles.userInfoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.userInfoHeader}>
              <Icon name="person" size={24} color="#667eea" />
              <Text style={styles.userInfoTitle}>Rate Customer</Text>
            </View>
            <View style={styles.userProfile}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.profileImageContainer}
              >
                {customerInfo.profilePhoto ? (
                  <Image source={{ uri: customerInfo.profilePhoto }} style={styles.profileImage} />
                ) : (
                  <Icon name="person" size={32} color="#fff" />
                )}
              </LinearGradient>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{customerInfo.name || "Customer"}</Text>
                <Text style={styles.userRole}>Rider</Text>
                <View style={styles.userPhoneContainer}>
                  <Icon name="phone" size={14} color="#64748b" />
                  <Text style={styles.userPhone}>{customerInfo.phone || "Not provided"}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Overall Rating */}
        <View style={styles.ratingSection}>
          <StarRating 
            rating={overallRating} 
            onRatingChange={setOverallRating} 
            size={44} 
            label="Overall Experience" 
          />
        </View>

        {/* Detailed Ratings */}
        <View style={styles.detailedRatings}>
          <View style={styles.sectionHeader}>
            <Icon name="feedback" size={22} color="#667eea" />
            <Text style={styles.sectionTitle}>Rate Customer Behavior</Text>
          </View>
          <StarRating 
            rating={communicationRating} 
            onRatingChange={setCommunicationRating} 
            label="Communication" 
          />
          <StarRating 
            rating={punctualityRating} 
            onRatingChange={setPunctualityRating} 
            label="Punctuality" 
          />
        </View>

        {/* Tags */}
        <View style={styles.tagsSection}>
          <TagSelector 
            tags={positiveTags} 
            selectedTags={selectedTags} 
            onTagToggle={handleTagToggle} 
            isPositive 
          />
          <TagSelector 
            tags={negativeTags} 
            selectedTags={selectedTags} 
            onTagToggle={handleTagToggle} 
            isPositive={false} 
          />
        </View>

        {/* Comments */}
        <Animated.View style={[styles.commentsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.commentsHeader}>
            <Icon name="comment" size={22} color="#667eea" />
            <Text style={styles.sectionTitle}>Additional Comments</Text>
          </View>
          <TextInput
            style={styles.commentsInput}
            placeholder="Share your experience with the customer or any additional feedback..."
            placeholderTextColor="#94a3b8"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.commentsHint}>
            {comments.length}/500 characters
          </Text>
        </Animated.View>

        {/* Submit Button */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmitFeedback}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isSubmitting ? ['#94a3b8', '#64748b'] : ['#667eea', '#764ba2']}
              style={styles.submitButtonGradient}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Icon name="send" size={22} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.05,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.1,
  },
  circle1: {
    width: 350,
    height: 350,
    backgroundColor: '#667eea',
    top: -150,
    right: -120,
    borderRadius: 175,
  },
  circle2: {
    width: 250,
    height: 250,
    backgroundColor: '#764ba2',
    bottom: -80,
    left: -80,
    borderRadius: 125,
  },
  circle3: {
    width: 180,
    height: 180,
    backgroundColor: '#f59e0b',
    top: '30%',
    right: -40,
    borderRadius: 90,
    opacity: 0.08,
  },
  gridPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.03,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    marginBottom: 10,
  },
  backButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 44,
  },
  rideSummaryCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  rideSummaryGradient: {
    padding: 20,
  },
  rideSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rideSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  rideDetails: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  rideDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    width: 45,
    marginLeft: 8,
  },
  rideDetailValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
  },
  userPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userPhone: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  ratingSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  detailedRatings: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
    textAlign: 'center',
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  tagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  positiveTagsTitle: {
    color: '#10b981',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    gap: 6,
  },
  selectedTag: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  positiveTag: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  negativeTag: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  positiveTagText: {
    color: '#10b981',
  },
  selectedTagText: {
    color: '#fff',
  },
  tagCheck: {
    marginLeft: 4,
  },
  commentsSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  commentsInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  commentsHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'right',
  },
  submitButton: {
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default DriverFeedback;
