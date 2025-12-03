
import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

// Try multiple IPs for local network flexibility
const API_URLS = [
  "http://192.168.1.2:5000",    // New IP
  "http://10.139.99.126:5000",
  "http://10.219.191.57:5000",  // Original IP
];

const API_BASE_URL = "https://soberfolks-backend-production.up.railway.app"; // For local testing

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

  const StarRating = ({ rating, onRatingChange, size = 32, color = '#FFD700', label }: {
    rating: number; onRatingChange: (r: number) => void; size?: number; color?: string; label: string;
  }) => (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1,2,3,4,5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onRatingChange(star)} style={styles.starButton}>
            <Image
              source={{ uri: star <= rating
                ? "https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
                : "https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
              }}
              style={[styles.star, { width: size, height: size, tintColor: star <= rating ? color : '#E0E0E0' }]}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>{rating > 0 ? `${rating}/5` : 'Tap to rate'}</Text>
    </View>
  );

  const TagSelector = ({ tags, selectedTags, onTagToggle, isPositive = true }: {
    tags: string[];
    selectedTags: string[];
    onTagToggle: (tag: string) => void;
    isPositive?: boolean;
  }) => {
    const getTitle = () => isPositive ? '👍 What did the customer do well?' : '👎 What could the customer improve?';
    return (
      <View style={styles.tagsContainer}>
        <Text style={styles.tagsTitle}>{getTitle()}</Text>
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
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.selectedTagText]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(feedbackData)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Feedback Submitted! 🎉', 'Thank you for your feedback.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else throw new Error(data.error || 'Submission failed');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Submission Failed', 'Unable to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/271/271220.png" }} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Ride</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Ride Summary */}
        {rideDetails && (
          <LinearGradient colors={['#FF6B6B', '#6E44FF']} style={styles.rideSummaryCard}>
            <Text style={styles.rideSummaryTitle}>Ride Summary</Text>
            <View style={styles.rideDetails}>
              <View style={styles.rideDetailRow}><Text style={styles.rideDetailLabel}>From:</Text><Text style={styles.rideDetailValue}>{rideDetails.pickup}</Text></View>
              <View style={styles.rideDetailRow}><Text style={styles.rideDetailLabel}>To:</Text><Text style={styles.rideDetailValue}>{rideDetails.drop}</Text></View>
              <View style={styles.rideDetailRow}><Text style={styles.rideDetailLabel}>Fare:</Text><Text style={styles.rideDetailValue}>₹{rideDetails.fare}</Text></View>
              <View style={styles.rideDetailRow}><Text style={styles.rideDetailLabel}>Date:</Text><Text style={styles.rideDetailValue}>{rideDetails.date}</Text></View>
            </View>
          </LinearGradient>
        )}

        {/* Customer Info */}
        {customerInfo && (
          <View style={styles.userInfoCard}>
            <Text style={styles.userInfoTitle}>Rate Customer</Text>
            <View style={styles.userProfile}>
              <View style={styles.profileImageContainer}>
                {customerInfo.profilePhoto ? (
                  <Image source={{ uri: customerInfo.profilePhoto }} style={styles.profileImage} />
                ) : (
                  <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }} style={styles.placeholderImage} />
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{customerInfo.name}</Text>
                <Text style={styles.userRole}>Customer</Text>
                <Text style={styles.userPhone}>{customerInfo.phone}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Overall Rating */}
        <View style={styles.ratingSection}>
          <StarRating rating={overallRating} onRatingChange={setOverallRating} size={40} label="Overall Experience" />
        </View>

        {/* Detailed Ratings */}
        <View style={styles.detailedRatings}>
          <Text style={styles.sectionTitle}>Rate Customer Behavior</Text>
          <StarRating rating={communicationRating} onRatingChange={setCommunicationRating} label="Customer Communication" />
          <StarRating rating={punctualityRating} onRatingChange={setPunctualityRating} label="Customer Punctuality" />
        </View>

        {/* Tags */}
        <View style={styles.tagsSection}>
          <TagSelector tags={positiveTags} selectedTags={selectedTags} onTagToggle={handleTagToggle} isPositive />
          <TagSelector tags={negativeTags} selectedTags={selectedTags} onTagToggle={handleTagToggle} isPositive={false} />
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Additional Comments</Text>
          <TextInput
            style={styles.commentsInput}
            placeholder="Share your experience with the customer or any additional feedback..."
            placeholderTextColor="#999"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmitFeedback}
          disabled={isSubmitting}
        >
          <LinearGradient colors={isSubmitting ? ['#ccc', '#999'] : ['#FF6B6B', '#6E44FF']} style={styles.submitButtonGradient}>
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 12 }} />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png" }} style={styles.submitIcon} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

// Paste full styles from original FeedbackScreen here
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBF8' },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, marginBottom: 10 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.1, shadowRadius:4, elevation:3 },
  backIcon:{width:24,height:24,tintColor:'#6E44FF'},
  headerTitle:{fontSize:24,fontWeight:'900',color:'#2D3436',letterSpacing:-0.5},
  placeholder:{width:40},
  rideSummaryCard:{padding:24,borderRadius:24,marginBottom:20,shadowColor:'#6E44FF',shadowOffset:{width:0,height:8},shadowOpacity:0.3,shadowRadius:16,elevation:12},
  rideSummaryTitle:{fontSize:20,fontWeight:'900',color:'#fff',marginBottom:16,textAlign:'center'},
  rideDetails:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16},
  rideDetailRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  rideDetailLabel:{fontSize:14,fontWeight:'700',color:'rgba(255,255,255,0.9)'},
  rideDetailValue:{fontSize:14,fontWeight:'600',color:'#fff',flex:1,textAlign:'right',marginLeft:8},
  userInfoCard:{backgroundColor:'#fff',borderRadius:24,padding:24,marginBottom:20,shadowColor:'#6E44FF',shadowOffset:{width:0,height:6},shadowOpacity:0.15,shadowRadius:12,elevation:8,borderWidth:1.5,borderColor:'rgba(110,68,255,0.08)'},
  userInfoTitle:{fontSize:18,fontWeight:'900',color:'#2D3436',textAlign:'center',marginBottom:16},
  userProfile:{flexDirection:'row',alignItems:'center'},
  profileImageContainer:{marginRight:16},
  profileImage:{width:60,height:60,borderRadius:30,borderWidth:3,borderColor:'#6E44FF'},
  placeholderImage:{width:60,height:60,borderRadius:30,tintColor:'#6E44FF'},
  userDetails:{flex:1},
  userName:{fontSize:18,fontWeight:'800',color:'#2D3436',marginBottom:4},
  userRole:{fontSize:14,fontWeight:'600',color:'#6E44FF',marginBottom:2},
  userPhone:{fontSize:13,color:'#636E72',fontWeight:'500'},
  ratingSection:{backgroundColor:'#fff',borderRadius:24,padding:24,marginBottom:20,shadowColor:'#6E44FF',shadowOffset:{width:0,height:6},shadowOpacity:0.15,shadowRadius:12,elevation:8,borderWidth:1.5,borderColor:'rgba(110,68,255,0.08)'},
  detailedRatings:{backgroundColor:'#fff',borderRadius:24,padding:24,marginBottom:20,shadowColor:'#6E44FF',shadowOffset:{width:0,height:6},shadowOpacity:0.15,shadowRadius:12,elevation:8,borderWidth:1.5,borderColor:'rgba(110,68,255,0.08)'},
  sectionTitle:{fontSize:18,fontWeight:'900',color:'#2D3436',marginBottom:20,textAlign:'center'},
  ratingContainer:{marginBottom:24},
  ratingLabel:{fontSize:16,fontWeight:'700',color:'#2D3436',marginBottom:12,textAlign:'center'},
  starsContainer:{flexDirection:'row',justifyContent:'center',marginBottom:8},
  starButton:{padding:4},
  star:{marginHorizontal:4},
  ratingText:{fontSize:14,fontWeight:'600',color:'#6E44FF',textAlign:'center'},
  tagsSection:{marginBottom:20},
  tagsContainer:{backgroundColor:'#fff',borderRadius:24,padding:24,marginBottom:16,shadowColor:'#6E44FF',shadowOffset:{width:0,height:6},shadowOpacity:0.15,shadowRadius:12,elevation:8,borderWidth:1.5,borderColor:'rgba(110,68,255,0.08)'},
  tagsTitle:{fontSize:16,fontWeight:'800',color:'#2D3436',marginBottom:16,textAlign:'center'},
  tagsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center'},
  tag:{paddingHorizontal:16,paddingVertical:8,borderRadius:20,margin:4,borderWidth:2,borderColor:'#E8E6FF',backgroundColor:'#F8F9FF'},
  selectedTag:{borderColor:'#6E44FF',backgroundColor:'#6E44FF'},
  positiveTag:{borderColor:'#4CAF50'},
  negativeTag:{borderColor:'#FF5722'},
  tagText:{fontSize:13,fontWeight:'600',color:'#636E72'},
  selectedTagText:{color:'#fff'},
  commentsSection:{backgroundColor:'#fff',borderRadius:24,padding:24,marginBottom:20,shadowColor:'#6E44FF',shadowOffset:{width:0,height:6},shadowOpacity:0.15,shadowRadius:12,elevation:8,borderWidth:1.5,borderColor:'rgba(110,68,255,0.08)'},
  commentsInput:{borderWidth:2,borderColor:'#E8E6FF',borderRadius:16,padding:16,fontSize:15,color:'#2D3436',backgroundColor:'#F8F9FF',minHeight:100,textAlignVertical:'top'},
  submitButton:{borderRadius:18,overflow:'hidden',marginBottom:20,shadowColor:'#6E44FF',shadowOffset:{width:0,height:8},shadowOpacity:0.35,shadowRadius:16,elevation:12},
  submitButtonGradient:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:20,paddingHorizontal:28},
  submitButtonText:{color:'#fff',fontSize:18,fontWeight:'900',marginRight:12,letterSpacing:0.5},
  submitIcon:{width:24,height:24,tintColor:'#fff'},
  disabledButton:{opacity:0.6},
  bottomSpacing:{height:40},
});

export default DriverFeedback;
