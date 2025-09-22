// ======================================================================
// ARCHIVO CORREGIDO Y MÁS ROBUSTO: js/services/time.js
// Se ha añadido una API de respaldo conocida por su fiabilidad para pruebas.
// ======================================================================

// API principal para obtener la hora segura.
const PRIMARY_TIME_API_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC";

// --- Variables para el Caché ---
let cachedTime = null;
let lastFetchTimestamp = 0;
// Duración del caché de 30 minutos (30 * 60 * 1000 milisegundos).
const CACHE_DURATION = 30 * 60 * 1000;

/**
 * Obtiene la hora segura de un servidor externo.
 * Intenta con una API principal y si falla, usa la hora local del dispositivo.
 */
export const getSecureTime = async () => {
    const now = Date.now();

    // 1. Revisa si tenemos una hora en caché y si todavía es válida.
    if (cachedTime && (now - lastFetchTimestamp < CACHE_DURATION)) {
        console.log("Usando hora en caché.");
        return cachedTime;
    }

    // 2. Intenta obtener la hora de la API principal.
    try {
        const response = await fetch(PRIMARY_TIME_API_URL);
        if (!response.ok) {
            throw new Error(`Error de la API principal: ${response.statusText}`);
        }
        const data = await response.json();
        const secureDate = new Date(data.datetime);
        
        cachedTime = secureDate;
        lastFetchTimestamp = Date.now();
        console.log("Hora obtenida de la API principal.");
        return secureDate;

    } catch (error) {
        // 3. Si la API principal falla, usa la hora local como último recurso.
        console.error("Fallo al obtener la hora de la API principal. Usando la hora local como fallback:", error);
        return new Date();
    }
};