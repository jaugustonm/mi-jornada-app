// ======================================================================
// ARCHIVO ACTUALIZADO: js/services/time.js
// Con una API de tiempo más estable para evitar errores de CORS y límite de solicitudes.
// ======================================================================

// Usaremos un endpoint que devuelve la hora UTC. Es más estable y no depende de la IP.
const TIME_API_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC";

// --- Variables para el Caché ---
let cachedTime = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

/**
 * Obtiene la hora segura de un servidor externo.
 * Si la API falla, recurre a la hora local del dispositivo como respaldo.
 */
export const getSecureTime = async () => {
    const now = Date.now();

    // 1. Revisa si tenemos una hora en caché y si todavía es válida.
    if (cachedTime && (now - lastFetchTimestamp < CACHE_DURATION)) {
        return cachedTime;
    }

    try {
        // 2. Intenta obtener la hora de la API.
        const response = await fetch(TIME_API_URL);
        if (!response.ok) {
            throw new Error(`Error al obtener la hora: ${response.statusText}`);
        }
        
        const data = await response.json();
        const secureDate = new Date(data.utc_datetime);

        // 3. Actualiza la caché y el timestamp.
        cachedTime = secureDate;
        lastFetchTimestamp = Date.now();

        return secureDate;
        
    } catch (error) {
        // 4. Si la API falla, usa la hora local como último recurso.
        console.error("No se pudo obtener la hora segura, usando hora local como fallback:", error);
        return new Date();
    }
};