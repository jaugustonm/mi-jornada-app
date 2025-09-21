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
    let isPenalty = task.status === 'pending_acceptance' ? '<span class="penalty-badge">Penalidad Sugerida</span>' : '';

    if (task.status === 'counter-proposed') {
        isPenalty = '<span class="penalty-badge" style="background-color: #FFC107;">Contrapropuesta</span>';
    } else if (task.status === 'rejected') {
        isPenalty = '<span class="penalty-badge" style="background-color: #F44336;">Rechazada</span>';
    }

    const getActionButtons = () => {
        // Vistas para el Supervisado
        if (userRole === 'supervisado') {
            switch (task.status) {
                case 'pending_acceptance':
                    return `
                        <button class="accept-btn">✅ Aceptar</button>
                        <button class="decline-btn">❌ Rechazar</button>
                    `;
                case 'rejected':
                    return `<button class="propose-alternative-btn">↪️ Proponer Alternativa</button>`;
                case 'pending':
                case 'accepted':
                    return `
                        <button class="complete-btn">✅ Completar</button>
                        <button class="evidence-btn">📸 Subir Evidencia</button>
                    `;
                case 'counter-proposed':
                    return `<p class="status-negotiation">Esperando respuesta del supervisor...</p>`;
            }
        }

        // Vistas para el Supervisor
        if (userRole === 'supervisor') {
            switch (task.status) {
                case 'completed':
                    return `
                        <button class="validate-btn">👍 Validar</button>
                        <button class="reject-btn">👎 Rechazar</button>
                    `;
                case 'counter-proposed':
                    return `
                        <button class="accept-proposal-btn">✔️ Aceptar Propuesta</button>
                        <button class="reject-proposal-btn">✖️ Rechazar Propuesta</button>
                    `;
                 case 'pending_acceptance':
                    return `<p class="status-negotiation">Esperando respuesta del supervisado...</p>`;
                 case 'rejected':
                    return `<p class="status-negotiation">Penalidad rechazada por el supervisado.</p>`;
            }
        }

        if (task.status === 'validated') {
            return `<p class="status-validated">Tarea Validada ✔️</p>`;
        }
        
        // Botón de evidencia por defecto si no hay otras acciones principales
        if (task.status !== 'completed' && task.status !== 'validated') {
             return `<button class="evidence-btn">📸 Subir Evidencia</button>`;
        }

        return ''; // No mostrar botones en otros casos
    };

    let counterProposalHTML = '';
    if (task.status === 'counter-proposed' && task.counterProposal) {
        counterProposalHTML = `
            <div class="counter-proposal">
                <h4>Contrapropuesta del supervisado:</h4>
                <p><strong>Nuevo Título:</strong> ${task.counterProposal.title}</p>
                <p><strong>Nueva Descripción:</strong> ${task.counterProposal.description}</p>
            </div>
        `;
    }

    return `
        <div class="task-card ${statusClass}" data-id="${task.id}">
            <h3>${task.title} ${isMandatory} ${isPenalty}</h3>
            <p>${task.description}</p>
            ${counterProposalHTML}
            <div class="task-actions">
                ${getActionButtons()}
            </div>
            ${task.evidence?.url ? `<a href="${task.evidence.url}" target="_blank">Ver evidencia</a>` : ''}
        </div>
    `;
};