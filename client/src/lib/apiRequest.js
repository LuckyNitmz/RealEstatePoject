import axios from "axios";

const apiRequest = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? "https://real-estate-poject-jlt8.vercel.app/api" 
    : "http://localhost:8800/api",
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for better error handling
apiRequest.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.log('Authentication error - user may need to login again');
      // Don't automatically redirect - let components handle this
    }
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default apiRequest;
