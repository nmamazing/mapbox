import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { colors } from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import HouseHuntingScreen from '../screens/HouseHuntingScreen';
import TestScreen from '../screens/TestScreen';
import DealOwnersScreen from '../screens/DealOwnersScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="HouseHunting" 
        component={HouseHuntingScreen}
        options={{ title: 'House Hunting' }}
      />
      <Stack.Screen 
        name="Test" 
        component={TestScreen}
        options={{ title: 'API Tests' }}
      />
      <Stack.Screen 
        name="DealOwners" 
        component={DealOwnersScreen}
        options={{ title: 'Deal Owners' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator; 