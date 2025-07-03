import React, { useEffect } from 'react';
import { View, Button, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

const discovery = {
  authorizationEndpoint: 'https://accounts.zoho.com/oauth/v2/auth',
  tokenEndpoint: 'https://accounts.zoho.com/oauth/v2/token',
};

const scopes = ['ZohoCRM.modules.ALL', 'aaaserver.profile.READ'];
const redirectUri = 'aaa-demo-app://oauth2redirect';

const LoginScreen = () => {
  const { signIn } = useAuth();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_ZOHO_CLIENT_ID || '',
      scopes,
      redirectUri,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery
  );
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      (async () => {
        setLoading(true);
        try {
          // Exchange code for tokens via backend
          const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirectUri,
              codeVerifier: request?.codeVerifier,
            }),
          });
          const data = await res.json();
          if (!data.accessToken) throw new Error('No access token received');

          // Fetch Zoho user profile
          const profileRes = await fetch('https://accounts.zoho.com/oauth/user/info', {
            headers: { Authorization: `Zoho-oauthtoken ${data.accessToken}` },
          });
          if (!profileRes.ok) throw new Error('Failed to fetch user profile');
          const profile = await profileRes.json();

          await signIn({
            id: profile.ZUID,
            name: profile.Full_Name,
            email: profile.Email,
          });
        } catch (err) {
          console.error('Zoho login error:', err);
          Alert.alert('Error', 'Failed to login with Zoho.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [response, request?.codeVerifier]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.form}>
        <Button
          title="Login with Zoho"
          disabled={!request || loading}
          onPress={() => promptAsync()}
        />
        {loading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 80,
    alignSelf: 'center',
    marginBottom: 40,
  },
  form: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default LoginScreen; 