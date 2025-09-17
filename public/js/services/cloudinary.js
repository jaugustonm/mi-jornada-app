// ======================================================================
// ARCHIVO COMPLETO Y CORREGIDO: js/services/cloudinary.js
// ======================================================================

// Usamos tu Cloud Name que me confirmaste anteriormente.
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dcjmylmjd/image/upload";

// ----------------------------------------------------------------------
// ⚠️ ¡CAMBIO IMPORTANTE!
// Usamos el nombre exacto del preset que acabas de crear: "mi_preset_app"
// ----------------------------------------------------------------------
const UPLOAD_PRESET = "mi_preset_app";

/**
 * Sube un archivo de imagen a Cloudinary usando un preset sin firmar.
 * @param {File | Blob} file - El archivo de imagen a subir.
 * @returns {Promise<string|null>} - La URL segura de la imagen subida, o null si hay un error.
 */
export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error.message);
        }

        const data = await res.json();
        return data.secure_url;

    } catch (error) {
        console.error("Error subiendo a Cloudinary:", error);
        return null;
    }
};