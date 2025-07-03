import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Lead, LeadStatus } from '../types';

const ZOHO_API_DOMAIN = Constants.expoConfig?.extra?.ZOHO_API_DOMAIN;
const ZOHO_REFRESH_TOKEN = Constants.expoConfig?.extra?.ZOHO_REFRESH_TOKEN;
const ZOHO_CLIENT_ID = Constants.expoConfig?.extra?.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = Constants.expoConfig?.extra?.ZOHO_CLIENT_SECRET;
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

// Validate environment variables
if (!ZOHO_REFRESH_TOKEN || !ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
  console.error('Missing required Zoho environment variables:', {
    refreshToken: ZOHO_REFRESH_TOKEN ? 'present' : 'missing',
    clientId: ZOHO_CLIENT_ID ? 'present' : 'missing',
    clientSecret: ZOHO_CLIENT_SECRET ? 'present' : 'missing'
  });
}

// Debug log environment variables
console.log('Zoho Environment Variables:', {
  domain: ZOHO_API_DOMAIN,
  refreshToken: ZOHO_REFRESH_TOKEN ? `${ZOHO_REFRESH_TOKEN.substring(0, 10)}...` : 'undefined',
  clientId: ZOHO_CLIENT_ID ? `${ZOHO_CLIENT_ID.substring(0, 10)}...` : 'undefined',
  clientSecret: ZOHO_CLIENT_SECRET ? `${ZOHO_CLIENT_SECRET.substring(0, 10)}...` : 'undefined'
});

interface ZohoUser {
  id: string;
  name: string;
  email: string;
}

interface ZohoDealsResponse {
  data: any[];
  total: number;
}

export class ZohoService {
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;
  private lastTokenRefresh: number = 0;
  private readonly TOKEN_REFRESH_COOLDOWN = 60000; // 1 minute cooldown

  // Add method to force token refresh
  public async forceTokenRefresh(): Promise<string> {
    console.log('Force refreshing token...');
    this.accessToken = null;
    this.accessTokenExpiry = 0;
    this.lastTokenRefresh = 0;
    return await this.getAccessToken();
  }

  public async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.accessToken && Date.now() < this.accessTokenExpiry) {
      console.log('Using cached access token:', this.accessToken.substring(0, 20) + '...');
      return this.accessToken;
    }
    try {
      // Check if we need to wait for rate limiting
      const now = Date.now();
      if (now - this.lastTokenRefresh < this.TOKEN_REFRESH_COOLDOWN) {
        console.log('Waiting for rate limit cooldown...');
        await new Promise(resolve => setTimeout(resolve, this.TOKEN_REFRESH_COOLDOWN - (now - this.lastTokenRefresh)));
      }
      console.log('Starting token refresh process...');
      console.log('Using refresh token:', ZOHO_REFRESH_TOKEN ? `${ZOHO_REFRESH_TOKEN.substring(0, 20)}...` : 'undefined');
      console.log('Using client ID:', ZOHO_CLIENT_ID ? `${ZOHO_CLIENT_ID.substring(0, 10)}...` : 'undefined');
      
      const response = await axios({
        method: 'post',
        url: 'https://accounts.zoho.com/oauth/v2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams({
          refresh_token: ZOHO_REFRESH_TOKEN || '',
          client_id: ZOHO_CLIENT_ID || '',
          client_secret: ZOHO_CLIENT_SECRET || '',
          grant_type: 'refresh_token'
        }).toString()
      });
      this.lastTokenRefresh = Date.now();
      console.log('Token refresh response:', {
        status: response.status,
        data: response.data,
        scopes: response.data?.scope || 'No scope in response'
      });
      if (!response.data?.access_token) {
        console.error('Invalid token response:', response.data);
        throw new Error('No access token in response');
      }
      const token = response.data.access_token;
      const expiresIn = response.data.expires_in ? parseInt(response.data.expires_in) : 3600;
      this.accessToken = token;
      this.accessTokenExpiry = Date.now() + (expiresIn - 60) * 1000; // expire 1 min early
      console.log('Successfully obtained new access token:', token.substring(0, 20) + '...');
      console.log('Token scopes:', response.data?.scope || 'No scope information');
      return token;
    } catch (error: any) {
      // Handle Zoho rate limit error
      if (error.response?.data?.error_description?.includes('too many requests')) {
        console.error('Zoho rate limit hit. Please wait before retrying.');
        throw new Error('Zoho rate limit hit. Please wait before retrying.');
      }
      console.error('Error in token refresh:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          data: error.config?.data
        }
      });
      throw new Error('Failed to get access token: ' + (error.response?.data?.error || error.message));
    }
  }

  async getLeads(): Promise<Lead[]> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${ZOHO_API_DOMAIN}/crm/v3/Leads`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          per_page: 100
        }
      });
      console.log('Full Leads API response:', response.data);
      if (!response.data?.data) {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format from Zoho API');
      }
      // Transform the response to match our Lead interface
      return response.data.data.map((lead: any) => ({
        id: lead.id,
        name: `${lead.First_Name || ''} ${lead.Last_Name || ''}`.trim(),
        email: lead.Email || '',
        phone: lead.Phone || '',
        address: lead.Address || '',
        status: lead.Status || LeadStatus.NEW,
        notes: '',
        createdAt: lead.Created_Time,
        updatedAt: lead.Created_Time
      }));
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  }

  async updateLeadStatus(leadId: string, status: LeadStatus, notes: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      await axios.put(
        `${ZOHO_API_DOMAIN}/crm/v3/Leads/${leadId}`,
        {
          data: [
            {
              Status: status,
              Notes: notes
            }
          ]
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`
          }
        }
      );
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  }

  async uploadPhoto(leadId: string, photoUri: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any); // TypeScript workaround for React Native

      await axios.post(
        `${ZOHO_API_DOMAIN}/crm/v3/Leads/${leadId}/Attachments`,
        formData,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  async getUsers(userIds: string[]): Promise<ZohoUser[]> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(
        `${ZOHO_API_DOMAIN}/crm/v3/users`,
        {
          headers: {
           'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            type: 'ActiveConfirmedUsers',
            per_page: 200
          }
        }
      );

      console.log('Users API Response:', {
        status: response.status,
        data: response.data
      });

      if (response.data?.users) {
        // Filter users by the provided IDs and map to our format
        return response.data.users
          .filter((user: any) => userIds.includes(user.id))
          .map((user: any) => ({
            id: user.id,
            name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email || ''
          }));
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching users:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          params: error.config?.params,
          headers: error.config?.headers
        }
      });
      throw error;
    }
  }

  async getDeals(
    fields: string = 'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
    sortBy: string = 'Created_Time',
    sortOrder: 'asc' | 'desc' = 'desc',
    criteria?: string,
    page: number = 1,
    perPage: number = 200,
    pageToken?: string
  ): Promise<any> {
    const token = await this.getAccessToken();
    let url = `${ZOHO_API_DOMAIN}/crm/v3/Potentials?fields=${fields}&sort_by=${sortBy}&sort_order=${sortOrder}&per_page=${perPage}`;
    if (criteria) url += `&criteria=${encodeURIComponent(criteria)}`;
    if (pageToken) {
      url += `&page_token=${pageToken}`;
    } else {
      url += `&page=${page}`;
    }
    console.log('[Zoho getDeals] Fetching:', url);
    const response = await fetch(
      url,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Zoho getDeals] Failed to fetch deals:', response.status, errorText);
      throw new Error(`Failed to fetch deals: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch all deals for the given fields, sort, and criteria, aggregating all pages.
   */
  async getAllDeals(
    fields: string = 'id,Deal_Name,Stage,Created_Time,Owner,Secondary_Acquisition,Property_Address,Property_City,Property_Zip,US_State',
    sortBy: string = 'Created_Time',
    sortOrder: 'asc' | 'desc' = 'desc',
    criteria?: string,
    perPage: number = 200
  ): Promise<any[]> {
    let nextPageToken: string | undefined = undefined;
    let isFirstPage = true;
    let allDeals: any[] = [];
    let totalFetched = 0;
    let keepGoing = true;
    while (keepGoing) {
      let response;
      if (isFirstPage) {
        response = await this.getDeals(fields, sortBy, sortOrder, criteria, 1, perPage);
        isFirstPage = false;
        console.log('[Zoho getAllDeals] Full first page response:', JSON.stringify(response, null, 2));
      } else {
        response = await this.getDeals(fields, sortBy, sortOrder, criteria, 1, perPage, nextPageToken);
      }
      if (response.data && Array.isArray(response.data)) {
        allDeals = allDeals.concat(response.data);
        totalFetched += response.data.length;
        console.log(`[Zoho getAllDeals] ${nextPageToken ? 'Cursor' : 'Page'} ${nextPageToken || 1}: fetched ${response.data.length}, total so far: ${totalFetched}`);
        if (response.info && response.info.more_records && response.info.next_page_token) {
          nextPageToken = response.info.next_page_token;
        } else {
          keepGoing = false;
        }
      } else {
        keepGoing = false;
      }
    }
    return allDeals;
  }

  async refreshDeals(): Promise<Lead[]> {
    try {
      // Get all leads
      const leads = await this.getLeads();
      const updatedLeads: Lead[] = [];

      // Process each lead that needs geocoding
      for (const lead of leads) {
        if (!lead.latitude || !lead.longitude || !lead.accuracy) {
          try {
            // Get coordinates for the address
            if (lead.address) {
              const coordinates = await this.getCoordinatesForAddress(lead.address);
              
              if (coordinates) {
                // Update the lead with new coordinates
                const updatedLead = {
                  ...lead,
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                  accuracy: coordinates.accuracy
                };

                // Update the lead in Zoho
                await this.updateLead(updatedLead);
                updatedLeads.push(updatedLead);
              }
            }
          } catch (error) {
            console.error(`Failed to geocode address for lead ${lead.id}:`, error);
          }
        } else {
          updatedLeads.push(lead);
        }
      }

      return updatedLeads;
    } catch (error) {
      console.error('Error refreshing deals:', error);
      throw error;
    }
  }

  private async updateLead(lead: Lead): Promise<void> {
    try {
      const response = await fetch(`${ZOHO_API_DOMAIN}/crm/v3/Leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [{
            Latitude: lead.latitude,
            Longitude: lead.longitude,
            Accuracy: lead.accuracy
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  /**
   * Get coordinates for an address using Google Maps Geocoding API
   */
  private async getCoordinatesForAddress(address: string): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return {
          latitude: lat,
          longitude: lng,
          accuracy: 100 // Default accuracy in meters
        };
      }
      
      console.error('Geocode failed:', data.status, data.error_message);
      return null;
    } catch (error) {
      console.error('Error in getCoordinatesForAddress:', error);
      return null;
    }
  }

  /**
   * Fetch detailed information for a single deal by ID
   */
  async getDealDetails(dealId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      // Fetch all the detailed fields we need for the Deal Details screen
      const fields = [
        'id',
        'Deal_Name',
        'Stage',
        'Lead_Source',
        'Foreclosure_Date',
        'Contact_Person',
        'Deal_Owner',
        'Property_Address',
        'Property_City',
        'Property_Zip',
        'Property_State',
        'Property_Owner',
        'Phone_Number',
        'Tax_Mailing_Address',
        'Notice_Date',
        'Property_Comp',
        'Max_Offer',
        'Loan_Estimate',
        'MLS_Parcel_Number',
        'MLS_Parcel_Link',
        'Date_of_Assignment',
        'County_Recorders_Number',
        'Original_Mortgage_Holder',
        'Age_Of_Homeowner',
        'Interest_Rate',
        'Assigned_Mortgage_Holder',
        'Seller',
        'Close_of_Escrow',
        'Legal_Description',
        'Earnest_Money',
        'Date_and_Time_Earnest_Money_Was_Sent',
        'Type',
        'Modified_By',
        'Date_Under_Contract',
        'Closing_Date',
        'Probability',
        'Expected_Revenue',
        'Created_By',
        'Created_Time',
        'Description',
        'Closing_Checklist',
        'PH',
        'PH_ID',
        'PH_Commission',
        'PH_Submitted_By'
      ].join(',');

      const url = `${ZOHO_API_DOMAIN}/crm/v3/Potentials/${dealId}?fields=${fields}`;
      console.log('[Zoho getDealDetails] Fetching:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Zoho getDealDetails] Failed to fetch deal details:', response.status, errorText);
        throw new Error(`Failed to fetch deal details: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Zoho getDealDetails] Response:', JSON.stringify(data, null, 2));
      
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('No deal data found');
      }

      return data.data[0];
    } catch (error: any) {
      console.error('[Zoho getDealDetails] Error:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<ZohoUser[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Try different API endpoints and parameters
      const endpoints = [
        '/crm/v3/users',
        '/crm/v3/settings/users',
        '/crm/v3/settings/user_roles'
      ];
      
      const params = [
        { type: 'ActiveConfirmedUsers', per_page: 200 },
        { per_page: 200 },
        { type: 'AllUsers', per_page: 200 },
        {}
      ];
      
      for (const endpoint of endpoints) {
        for (const paramSet of params) {
          try {
            console.log(`[Zoho getAllUsers] Trying endpoint: ${endpoint} with params:`, paramSet);
            const response = await axios.get(
              `${ZOHO_API_DOMAIN}${endpoint}`,
              {
                headers: {
                  'Authorization': `Zoho-oauthtoken ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                params: paramSet
              }
            );
            
            console.log(`[Zoho getAllUsers] SUCCESS with ${endpoint}:`, {
              status: response.status,
              data: response.data,
              hasUsers: !!response.data?.users,
              hasData: !!response.data?.data,
              keys: Object.keys(response.data || {})
            });
            
            // Try different response formats
            let users = [];
            if (response.data?.users) {
              users = response.data.users;
            } else if (response.data?.data) {
              users = response.data.data;
            } else if (Array.isArray(response.data)) {
              users = response.data;
            }
            
            if (users.length > 0) {
              return users.map((user: any) => ({
                id: user.id || user.user_id,
                name: user.full_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                email: user.email || user.email_id || ''
              }));
            }
          } catch (endpointError: any) {
            console.log(`[Zoho getAllUsers] Failed with ${endpoint}:`, {
              status: endpointError.response?.status,
              error: endpointError.response?.data,
              message: endpointError.message
            });
            // Continue to next combination
          }
        }
      }
      
      // If we get here, all combinations failed
      throw new Error('All users API endpoints failed');
      
    } catch (error: any) {
      console.error('[Zoho getAllUsers] All attempts failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          params: error.config?.params,
          headers: error.config?.headers
        }
      });
      throw error;
    }
  }
}

export const zohoService = new ZohoService();

// Utility to geocode an address using Google Maps API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    console.error('Geocode failed:', data.status, data.error_message);
    return null;
  } catch (err) {
    console.error('Error in geocodeAddress:', err);
    return null;
  }
}

// Utility to update Coordinates field in Zoho for a deal
export async function updateDealCoordinates(dealId: string, coordinates: string): Promise<void> {
  try {
    const token = await zohoService.getAccessToken();
    await fetch(
      `${ZOHO_API_DOMAIN}/crm/v3/Potentials/${dealId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: [
            { id: dealId, Coordinates: coordinates }
          ]
        })
      }
    );
  } catch (err) {
    console.error('Error updating deal coordinates:', err);
  }
}

// Utility to get coordinates for a deal (from field or via geocode+update)
export async function getDealCoordinates(deal: any): Promise<{ lat: number; lng: number } | null> {
  if (deal.Coordinates && typeof deal.Coordinates === 'string' && deal.Coordinates.includes(',')) {
    const [lat, lng] = deal.Coordinates.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  // If not present, geocode and update
  const address = `${deal.Property_Address}, ${deal.Property_City}, ${deal.US_State} ${deal.Property_Zip}`;
  const coords = await geocodeAddress(address);
  if (coords) {
    const coordString = `${coords.lat},${coords.lng}`;
    await updateDealCoordinates(deal.id, coordString);
    return coords;
  }
  return null;
}

/**
 * Save deals to AsyncStorage
 */
export async function saveDealsToStorage(deals: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem('deals_cache', JSON.stringify(deals));
  } catch (err) {
    console.error('Error saving deals to storage:', err);
  }
}

/**
 * Load deals from AsyncStorage
 */
export async function loadDealsFromStorage(): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem('deals_cache');
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('Error loading deals from storage:', err);
    return null;
  }
}

/**
 * Save user-specific deals to AsyncStorage
 * Data will be removed when app is uninstalled
 */
export async function saveUserDealsToStorage(userName: string, deals: any[]): Promise<void> {
  try {
    const key = `user_deals_${userName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const data = {
      userName,
      deals,
      lastUpdated: new Date().toISOString(),
      count: deals.length
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
    console.log(`Saved ${deals.length} deals for user ${userName} to local storage`);
  } catch (err) {
    console.error('Error saving user deals to storage:', err);
    throw err;
  }
}

/**
 * Load user-specific deals from AsyncStorage
 */
export async function loadUserDealsFromStorage(userName: string): Promise<any[] | null> {
  try {
    const key = `user_deals_${userName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      console.log(`Loaded ${parsed.count} deals for user ${userName} from local storage (last updated: ${parsed.lastUpdated})`);
      return parsed.deals;
    }
    return null;
  } catch (err) {
    console.error('Error loading user deals from storage:', err);
    return null;
  }
}

/**
 * Get storage info for a specific user
 */
export async function getUserDealsStorageInfo(userName: string): Promise<{ count: number; lastUpdated: string } | null> {
  try {
    const key = `user_deals_${userName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        count: parsed.count,
        lastUpdated: parsed.lastUpdated
      };
    }
    return null;
  } catch (err) {
    console.error('Error getting user deals storage info:', err);
    return null;
  }
}

/**
 * Clear user-specific deals from AsyncStorage
 */
export async function clearUserDealsFromStorage(userName: string): Promise<void> {
  try {
    const key = `user_deals_${userName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await AsyncStorage.removeItem(key);
    console.log(`Cleared deals for user ${userName} from local storage`);
  } catch (err) {
    console.error('Error clearing user deals from storage:', err);
    throw err;
  }
}

/**
 * List all users with stored deals
 */
export async function getAllStoredUserDeals(): Promise<{ userName: string; count: number; lastUpdated: string }[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userDealKeys = keys.filter(key => key.startsWith('user_deals_'));
    const users: { userName: string; count: number; lastUpdated: string }[] = [];
    
    for (const key of userDealKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        users.push({
          userName: parsed.userName,
          count: parsed.count,
          lastUpdated: parsed.lastUpdated
        });
      }
    }
    
    return users.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  } catch (err) {
    console.error('Error getting all stored user deals:', err);
    return [];
  }
} 