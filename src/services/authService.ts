import * as AuthSession from 'expo-auth-session';

const discovery = {
  authorizationEndpoint: 'https://accounts.zoho.com/oauth/v2/auth',
  tokenEndpoint: 'https://accounts.zoho.com/oauth/v2/token',
};

const redirectUri = 'aaa-demo-app://oauth2redirect';

const scopes = ['ZohoCRM.modules.ALL', 'aaaserver.profile.READ'];

export async function loginWithZoho() {
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
  return { request, response, promptAsync };
}

export async function exchangeCodeForToken({ code, codeVerifier }: { code: string; codeVerifier: string }) {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri, codeVerifier }),
  });
  if (!res.ok) throw new Error('Failed to exchange code for token');
  return res.json();
}

export async function getZohoUserProfile(accessToken: string) {
  const res = await fetch('https://accounts.zoho.com/oauth/user/info', {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const profile = await res.json();
  return {
    name: profile.Full_Name,
    email: profile.Email,
    id: profile.ZUID,
  };
}

export { discovery, redirectUri, scopes }; 