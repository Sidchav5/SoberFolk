// App.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, StatusBar, Platform, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/components/OnboardingScreen';
import HeroSection from './src/components/HeroSection';
import Benefits from './src/components/Benefits';
import Footer from './src/components/Footer';
import LoginScreen from './src/components/LoginScreen';
import SignupScreen from './src/components/SignupScreen';
import DriverScreen from './src/components/DriverScreen';
import ConsumerHome from './src/components/ConsumerHome';
import DriverFeedback from './src/components/DriverFeedback';
import ConsumerFeedback from './src/components/ConsumerFeedback';
import 'react-native-reanimated';
type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  DriverScreen: undefined;
  ConsumerHome: undefined;
  DriverFeedback: { rideId: number; customerInfo?: any; rideDetails?: any } | undefined;
  ConsumerFeedback: { rideId: number; driverInfo?: any; rideDetails?: any } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialRoute, setInitialRoute] = useState<string>('Home');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user has seen onboarding before
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      
      // Check for authentication token
      const authToken = await AsyncStorage.getItem('authToken');
      const userRole = await AsyncStorage.getItem('userRole');

      if (!hasSeenOnboarding) {
        // First time user - show onboarding
        setShowOnboarding(true);
        setIsLoading(false);
        return;
      }

      if (authToken && userRole) {
        // User is logged in - navigate to appropriate dashboard
        console.log('✅ Found existing auth token, auto-logging in as:', userRole);
        setInitialRoute(userRole === 'Consumer' ? 'ConsumerHome' : 'DriverScreen');
      } else {
        // User has seen onboarding but not logged in
        setInitialRoute('Home');
      }

      setShowOnboarding(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setShowOnboarding(false);
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (): Promise<void> => {
    // Mark onboarding as seen
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6E44FF" />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#f6f8ff"
          translucent={Platform.OS === 'android'}
        />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute as keyof RootStackParamList}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home">
          {() => (
            <SafeAreaView style={styles.container}>
              <StatusBar 
                barStyle="light-content" 
                backgroundColor="#667eea"
                translucent={Platform.OS === 'android'}
              />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <HeroSection />
                <Benefits />
                <Footer />
              </ScrollView>
            </SafeAreaView>
          )}
        </Stack.Screen>

        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="DriverScreen" component={DriverScreen} />
        <Stack.Screen name="ConsumerHome" component={ConsumerHome} />
        <Stack.Screen name="DriverFeedback" component={DriverFeedback} />
<Stack.Screen name="ConsumerFeedback" component={ConsumerFeedback} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faff',
  },
});

export default App;
