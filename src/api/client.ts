import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Optional: Logout user if token is invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // window.location.href = '/login'; // Force redirect if needed
        }
        return Promise.reject(error);
    }
);

export default client;
