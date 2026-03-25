import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SplashScreen } from '../screens/SplashScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NavigationScreen } from '../screens/NavigationScreen';

const Stack = createStackNavigator();

export const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Splash"
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#F8FAFC' },
    }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Report" component={ReportScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Navigate" component={NavigationScreen} />
  </Stack.Navigator>
);
