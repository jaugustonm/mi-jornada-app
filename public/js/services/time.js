// ======================================================================
// ARCHIVO ACTUALIZADO: js/services/time.js
// Se ha cambiado a una API más robusta para evitar errores 429.
// ======================================================================

// Usamos la API de TimeAPI.io para una mayor fiabilidad.
const TIME_API_URL = "https://timeapi.io/api/Time/current/zone?timeZone=Etc/UTC";

// --- Variables para el Caché ---
let cachedTime = null;
let lastFetchTimestamp = 0;
// Aumentamos la duración del caché a 30 minutos (30 * 60 * 1000 milisegundos).
// Esto reduce la frecuencia de peticiones a la API.
const CACHE_DURATION = 30 * 60 * 1000;

/**
 * Obtiene la hora segura de un servidor externo (TimeAPI.io).
 * Si la API falla, recurre a la hora local del dispositivo como respaldo.
 */
export const getSecureTime = async () => {
    const now = Date.now();

    // 1. Revisa si tenemos una hora en caché y si todavía es válida.
    if (cachedTime && (now - lastFetchTimestamp < CACHE_DURATION)) {
        return cachedTime;
    }

    try {
        // 2. Intenta obtener la hora de la nueva API.
        const response = await fetch(TIME_API_URL);
        if (!response.ok) {
            throw new Error(`Error al obtener la hora: ${response.statusText}`);
        }

        const data = await response.json();
        // La nueva API devuelve un formato diferente, extraemos el 'dateTime'
        const secureDate = new Date(data.dateTime);

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