import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Handle background/quit push notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[Background] Message:', remoteMessage.notification?.title);
});

AppRegistry.registerComponent(appName, () => App);