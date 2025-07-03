import * as AuthSession from "expo-auth-session";

const redirectUri = AuthSession.makeRedirectUri();

const discovery = {
  authorizationEndpoint: "https://accounts.zoho.com/oauth/v2/auth",

  tokenEndpoint: "https://accounts.zoho.com/oauth/v2/token",
};

const getZohoUserProfile = async (accessToken: string) => {
  try {
    const res = await fetch("https://accounts.zoho.com/oauth/user/info", {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch user profile");

    const profile = await res.json();

    return {
      name: profile.Full_Name,

      email: profile.Email,

      id: profile.ZUID,
    };
  } catch (err) {
    console.error("Error fetching Zoho user profile:", err);

    throw err;
  }
};

export { redirectUri, discovery, getZohoUserProfile };
