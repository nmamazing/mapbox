// Replace this with your computer's IP address when testing
export const API_BASE_URL = 'http://192.168.0.73:4000/api';

export const API_ENDPOINTS = {
  ADD_LOCATION: 'http://localhost:3000/api/agent/v1/locations',
  GET_LOCATIONS: 'http://localhost:3000/api/agent/v1/locations',
  GET_USER_LOCATIONS: (user: string) => `http://localhost:3000/api/agent/v1/locations/user/${user}`,
  HEALTH: 'http://localhost:3000/api/health',
  DEALS: 'http://localhost:3000/api/agent/v1/deals'
}; 