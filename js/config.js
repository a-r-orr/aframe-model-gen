// Define the base IP address for the APIs.
const API_HOST = 'https://192.168.0.33';

// Construct the full API endpoints.
export const IMAGE_API_URL = `${API_HOST}/image/images/create-image`;
export const MODEL_API_URL = `${API_HOST}/model/models/create-from-image`;