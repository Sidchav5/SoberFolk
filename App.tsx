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

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  useEffect(() => {
    setShowOnboarding(true); // For demo purposes
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
