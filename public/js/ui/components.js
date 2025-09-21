import { getCommentsForTask } from '../services/firestore.js';

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
    let specialStatusBadge = '';

    if (task.taskType === 'penalty') {
        if (task.status === 'pending_acceptance') {
            specialStatusBadge = '<span class="penalty-badge">Penalidad Sugerida</span>';
        } else if (task.status === 'counter-proposed') {
            specialStatusBadge = '<span class="penalty-badge" style="background-color: #FFC107;">Contrapropuesta</span>';
        } else if (task.status === 'rejected') {
            specialStatusBadge = '<span class="penalty-badge" style="background-color: #F44336;">Rechazada</span>';
        } else if (task.status === 'final_penalty') {
            specialStatusBadge = '<span class="penalty-badge" style="background-color: #000000;">Penalidad Final</span>';
        } else if (task.status === 'negotiation_locked') {
            specialStatusBadge = '<span class="penalty-badge" style="background-color: #607D8B;">Decisión Final</span>';
        }
    } else if (task.status === 'pending_acceptance') {
        specialStatusBadge = '<span class="penalty-badge" style="background-color: #2196F3;">Pendiente de Aceptación</span>';
    }


    const proposalCounts = task.proposalCounts || { supervisor: 0, supervised: 0 };

    const getActionButtons = () => {
        // Vistas para el Supervisado
        if (userRole === 'supervisado') {
            let supervisedButtons = `<button class="add-comment-btn">💬 Añadir Comentario</button>`;
            switch (task.status) {
                case 'pending_acceptance':
                    if (task.taskType === 'penalty') {
                        supervisedButtons += `
                            <button class="accept-btn">✅ Aceptar Penalidad</button>
                            <button class="decline-btn">❌ Rechazar Penalidad</button>
                        `;
                    } else {
                        supervisedButtons += `
                            <button class="accept-task-btn">✅ Aceptar Tarea</button>
                            <button class="decline-task-btn">❌ Rechazar Tarea</button>
                        `;
                    }
                    break;
                case 'rejected':
                    if (task.taskType === 'penalty') {
                        if (proposalCounts.supervised < 2) {
                            supervisedButtons += `<button class="propose-alternative-btn">↪️ Proponer Alternativa</button>`;
                        } else {
                            supervisedButtons += `<p class="status-negotiation">Límite de propuestas alcanzado.</p>`;
                        }
                    } else {
                        supervisedButtons += `<p class="status-negotiation">Has rechazado esta tarea.</p>`;
                    }
                    break;
                case 'pending':
                case 'accepted':
                case 'final_penalty':
                    supervisedButtons += `
                        <button class="evidence-btn">📸 Subir Evidencia para Completar</button>
                    `;
                    break;
                case 'counter-proposed':
                    supervisedButtons += `<p class="status-negotiation">Esperando respuesta del supervisor...</p>`;
                    break;
                case 'negotiation_locked':
                    supervisedButtons += `<p class="status-negotiation">Negociación bloqueada. Esperando la decisión final del supervisor.</p>`;
                    break;
            }
            return supervisedButtons;
        }


        // Vistas para el Supervisor
        if (userRole === 'supervisor') {
            let supervisorButtons = `<button class="add-comment-btn">💬 Añadir Comentario</button>`;
            switch (task.status) {
                case 'completed':
                    supervisorButtons += `
                        <button class="validate-btn">👍 Validar</button>
                        <button class="reject-btn">👎 Rechazar</button>
                    `;
                    break;
                case 'counter-proposed':
                    if (proposalCounts.supervisor < 2) {
                        supervisorButtons += `
                            <button class="accept-proposal-btn">✔️ Aceptar Propuesta</button>
                            <button class="reject-proposal-btn">✖️ Rechazar Propuesta</button>
                        `;
                    } else {
                        supervisorButtons += `<button class="set-final-penalty-btn">Definir Penalidad Final</button>`;
                    }
                    break;
                 case 'pending_acceptance':
                     supervisorButtons += `<p class="status-negotiation">Esperando aceptación del supervisado...</p>`;
                     break;
                 case 'rejected':
                    if (task.taskType === 'penalty') {
                        if (proposalCounts.supervisor < 2) {
                            supervisorButtons += `<button class="reject-proposal-btn">↪️ Hacer Contrapropuesta</button>`;
                        } else {
                            supervisorButtons += `<button class="set-final-penalty-btn">Definir Penalidad Final</button>`;
                        }
                    } else {
                        supervisorButtons += `<p class="status-negotiation">Tarea rechazada por el supervisado.</p> 
                                              <button class="reject-btn delete-task-btn">🗑️ Eliminar Tarea</button>`;
                    }
                    break;
                 case 'negotiation_locked':
                     supervisorButtons += `<button class="set-final-penalty-btn">Definir Penalidad Final</button>`;
                     break;
            }
            return supervisorButtons;
        }

        if (task.status === 'validated') {
            return `<p class="status-validated">Tarea Validada ✔️</p>`;
        }
        
        if (userRole === 'supervisado' && task.status !== 'completed' && task.status !== 'validated') {
             return `<button class="evidence-btn">📸 Subir Evidencia</button>`;
        }

        return '';
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

    // Cargar y mostrar comentarios
    setTimeout(() => {
        const commentsContainer = document.querySelector(`.task-card[data-id="${task.id}"] .task-comments-container`);
        if (commentsContainer) {
            getCommentsForTask(task.id, (comments) => {
                commentsContainer.innerHTML = '<h4>Comentarios:</h4>';
                if (comments.length > 0) {
                    comments.forEach(comment => {
                        commentsContainer.innerHTML += `<div class="task-comment">${comment.text}</div>`;
                    });
                } else {
                    commentsContainer.innerHTML += `<p>No hay comentarios.</p>`;
                }
            });
        }
    }, 0);

    return `
        <div class="task-card ${statusClass}" data-id="${task.id}">
            <h3>${task.title} ${isMandatory} ${specialStatusBadge}</h3>
            <p>${task.description}</p>
            ${counterProposalHTML}
            <div class="task-actions">
                ${getActionButtons()}
            </div>
            <div class="task-comments-container">
                </div>
            ${task.evidence?.url ? `<a href="${task.evidence.url}" target="_blank">Ver evidencia</a>` : ''}
        </div>
    `;
};