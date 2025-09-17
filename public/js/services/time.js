const TIME_API_URL = "https://worldtimeapi.org/api/ip";

export const getSecureTime = async () => {
    try {
        const response = await fetch(TIME_API_URL);
        const data = await response.json();
        // La fecha viene en formato ISO 8601, que el constructor de Date entiende.
        return new Date(data.utc_datetime);
    } catch (error) {
        console.error("No se pudo obtener la hora segura, usando hora local como fallback:", error);
        // Fallback a la hora local si la API falla.
        return new Date();
    }
};