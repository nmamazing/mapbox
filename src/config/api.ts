// API configuration for the Next.js backend
export const API_BASE_URL = 'https://aaabe.amazingoffer.com/api/agent/v1';

export const API_ENDPOINTS = {
  // Location endpoints
  ADD_LOCATION: `${API_BASE_URL}/locations`,
  GET_LOCATIONS: `${API_BASE_URL}/locations/recent`,
  GET_USER_LOCATIONS: (user: string) => `${API_BASE_URL}/locations/user/${user}`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`,
  
  // Deals endpoint
  DEALS: `${API_BASE_URL}/deals`
}; 