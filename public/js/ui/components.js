/**
 * Genera el HTML para una sola tarjeta de tarea, mostrando diferentes acciones
 * según el rol del usuario y el estado de la tarea.
 * @param {object} task - El objeto de la tarea.
 * @param {string} userRole - El rol del usuario actual ('supervisor' o 'supervisado').
 * @returns {string} - Una cadena de texto con el HTML de la tarjeta.
 */
export const renderTask = (task, userRole) => {
    const statusClass = task.status === 'completed' || task.status === 'validated' ? 'task-completed' : '';
    const isMandatory = task.isMandatory ? '<span class="mandatory-badge">Obligatorio</span>' : '';
    const isPenalty = task.status === 'pending_acceptance' ? '<span class="penalty-badge">Penalidad Sugerida</span>' : '';

    // Función interna para decidir qué botones mostrar
    const getActionButtons = () => {
        // Si es una penalidad sugerida para el supervisado
        if (userRole === 'supervisado' && task.status === 'pending_acceptance') {
            return `
                <button class="accept-btn">✅ Aceptar</button>
                <button class="decline-btn">❌ Rechazar</button>
            `;
        }
        
        // Si el supervisor está viendo una tarea completada por el supervisado
        if (userRole === 'supervisor' && task.status === 'completed') {
            return `
                <button class="validate-btn">👍 Validar</button>
                <button class="reject-btn">👎 Rechazar</button>
            `;
        }
        
        // Si el supervisado está viendo una tarea pendiente o aceptada
        if (userRole === 'supervisado' && (task.status === 'pending' || task.status === 'accepted')) {
            return `
                <button class="complete-btn">✅ Completar</button>
                <button class="evidence-btn">📸 Subir Evidencia</button>
            `;
        }
        
        // Si la tarea ya está validada, no hay más acciones
        if (task.status === 'validated') {
            return `<p class="status-validated">Tarea Validada ✔️</p>`;
        }
        
        // Por defecto, solo mostramos el botón de evidencia si no está completada
        if (task.status !== 'completed' && task.status !== 'validated' && task.status !== 'pending_acceptance') {
             return `<button class="evidence-btn">📸 Subir Evidencia</button>`;
        }

        return ''; // No mostrar botones en otros casos
    };

    return `
        <div class="task-card ${statusClass}" data-id="${task.id}">
            <h3>${task.title} ${isMandatory} ${isPenalty}</h3>
            <p>${task.description}</p>
            <div class="task-actions">
                ${getActionButtons()}
            </div>
            ${task.evidence?.url ? `<a href="${task.evidence.url}" target="_blank">Ver evidencia</a>` : ''}
        </div>
    `;
};