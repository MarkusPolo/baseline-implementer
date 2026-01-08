import axios from "axios";

const api = axios.create({
    baseURL: '/api',  // Nginx will proxy to backend
});

export default api;
