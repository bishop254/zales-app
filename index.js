import '@expo/metro-runtime';

import React from 'react';
import { AppRegistry, Platform, View } from 'react-native';

import { App } from 'expo-router/build/qualified-entry';
import * as SplashScreen from 'expo-router/build/utils/splash';

function registerRootWithoutKeepAwake(Component) {
  let RootComponent = Component;

  if (process.env.NODE_ENV !== 'production') {
    const { withErrorOverlay } = require('@expo/metro-runtime/error-overlay');
    RootComponent = withErrorOverlay(Component);
  }

  AppRegistry.registerComponent('main', () => RootComponent);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const rootTag = document.getElementById('root');

    if (process.env.NODE_ENV !== 'production' && !rootTag) {
      throw new Error('Required HTML element with id "root" was not found in the document HTML.');
    }

    AppRegistry.runApplication('main', {
      rootTag,
      hydrate: globalThis.__EXPO_ROUTER_HYDRATE__,
    });
  }
}

try {
  setTimeout(() => {
    SplashScreen._internal_preventAutoHideAsync?.();
  });

  React.startTransition(() => {
    registerRootWithoutKeepAwake(App);
  });
} catch (error) {
  SplashScreen.hideAsync();
  AppRegistry.registerComponent('main', () => View);

  setTimeout(() => {
    throw error;
  });
}
