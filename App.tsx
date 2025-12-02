// App.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, StatusBar, Platform, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>("Home");

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const [authToken, userRole, hasSeenOnboarding] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('userRole'),
        AsyncStorage.getItem('hasSeenOnboarding')
      ]);
  
      if (authToken && userRole) {
        // User is logged in, navigate to appropriate screen
        setInitialRoute(userRole === 'Driver' ? 'DriverScreen' : 'ConsumerHome');
        setShowOnboarding(false);
      } else {
        // No auth token = logged out, show onboarding again
        setShowOnboarding(true);
        setInitialRoute('Home');
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (): Promise<void> => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
    setInitialRoute('Home');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
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
        initialRouteName={initialRoute}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
