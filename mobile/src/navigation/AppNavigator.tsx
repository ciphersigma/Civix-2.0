import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { AuthService } from '../services/AuthService';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    AuthService.isAuthenticated().then(auth => {
      setInitialRoute(auth ? 'Home' : 'Login');
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: { backgroundColor: '#F8FAFC', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#1F2937',
      }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Report Waterlogging', headerBackTitle: 'Map' }} />
    </Stack.Navigator>
  );
};
