import axios from "axios";

const api = axios.create({
    baseURL: '/api/',  // Trailing slash is important for FastAPI
});

export default api;
