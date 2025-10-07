// App.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './src/components/OnboardingScreen';
import HeroSection from './src/components/HeroSection';
import Benefits from './src/components/Benefits';
import Footer from './src/components/Footer';
import LoginScreen from './src/components/LoginScreen';
import SignupScreen from './src/components/SignupScreen';
import DriverScreen from './src/components/DriverScreen';
import ConsumerHome from './src/components/ConsumerHome';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  DriverScreen: undefined;
  ConsumerHome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  useEffect(() => {
    setShowOnboarding(true); // For demo purposes, always show onboarding on app start
  }, []);

  const handleOnboardingComplete = (): void => {
    setShowOnboarding(false);
  };

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
        initialRouteName="Home"
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
});

export default App;
