import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Grocery List',
  slug: 'grocery-list-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'grocerylist',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.grocerylistapp',
    infoPlist: {
      NSCameraUsageDescription:
        'Allow Grocery List to use the camera to scan barcodes on grocery items.',
      NSMicrophoneUsageDescription:
        'Allow Grocery List to use the microphone for voice input.',
      NSSpeechRecognitionUsageDescription:
        'Allow Grocery List to use speech recognition to add items hands-free.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#E6F4FE',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow Grocery List to use the camera to scan barcodes on grocery items.',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'Allow Grocery List to use the microphone for voice input.',
        speechRecognitionPermission:
          'Allow Grocery List to use speech recognition to add items hands-free.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '59f89bf1-99d8-46e6-8aae-4870c8536d1c',
    },
  },
  owner: 'fslauq',
});
