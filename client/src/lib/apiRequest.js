import axios from "axios";

const apiRequest = axios.create({
  // baseURL: "http://localhost:8800/api",
  baseURL: "https://real-estate-poject-jlt8.vercel.app/",
  withCredentials: true,
});

export default apiRequest;