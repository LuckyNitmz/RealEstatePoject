import axios from "axios";

const apiRequest = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? "https://real-estate-poject-jlt8.vercel.app/api" 
    : "http://localhost:8800/api",
  withCredentials: true,
});

export default apiRequest;