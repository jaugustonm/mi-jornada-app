const TIME_API_URL = "https://worldtimeapi.org/api/ip";

// --- Variables for Caching ---
let cachedTime = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const getSecureTime = async () => {
    const now = Date.now();

    // 1. Check if we have a cached time and if it's still valid
    if (cachedTime && (now - lastFetchTimestamp < CACHE_DURATION)) {
        return cachedTime;
    }

    try {
        const response = await fetch(TIME_API_URL);
        if (!response.ok) {
            // If the API call fails, fall back to local time and don't update the cache
            console.error(`Error fetching secure time: ${response.statusText}`);
            return new Date();
        }
        const data = await response.json();
        const secureDate = new Date(data.utc_datetime);

        // 2. Update cache and timestamp
        cachedTime = secureDate;
        lastFetchTimestamp = Date.now();

        return secureDate;
    } catch (error) {
        console.error("No se pudo obtener la hora segura, usando hora local como fallback:", error);
        // Fallback to local time if the API call fails.
        return new Date();
    }
};