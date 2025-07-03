import axios from "axios";

const POST = async (req: Request) => {
  try {
    const { code, redirectUri, codeVerifier } = await req.json();

    if (!code || !redirectUri || !codeVerifier) {
      return new Response(
        JSON.stringify({
          errorMessage: "Missing code, redirectUri, or codeVerifier",
        }),

        {
          status: 400,
        }
      );
    }

    const body = new URLSearchParams({
      code,

      client_id: process.env["ZOHO_CLIENT_ID"]!,

      client_secret: process.env["ZOHO_CLIENT_SECRET"]!,

      redirect_uri: redirectUri,

      grant_type: "authorization_code",

      code_verifier: codeVerifier,
    }).toString();

    const response = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",

      body,

      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    return new Response(
      JSON.stringify({
        accessToken: data.access_token,

        refreshToken: data.refresh_token,

        expiresIn: data.expires_in,

        apiDomain: data.api_domain,

        tokenType: data.token_type,
      }),

      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "Zoho token exchange error:",

      error?.response?.data || error.message
    );

    return new Response(
      JSON.stringify({
        errorMessage: "Token exchange error.",
      }),

      {
        status: 400,
      }
    );
  }
};

export { POST };
