// Replace this with your computer's IP address when testing
export const API_BASE_URL = 'http://192.168.0.73:4000/api';

export const API_ENDPOINTS = {
  ADD_LOCATION: `${API_BASE_URL}/add-location`,
  GET_LOCATIONS: `${API_BASE_URL}/locations/recent`,
  GET_USER_LOCATIONS: (user: string) => `${API_BASE_URL}/locations/user/${user}`,
  HEALTH: `${API_BASE_URL}/health`,
}; 