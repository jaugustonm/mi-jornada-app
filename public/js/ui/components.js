import { getCommentsForTask } from '../services/firestore.js';

/**
 * Genera el HTML para una sola tarjeta de tarea, mostrando diferentes acciones
 * según el rol del usuario y el estado de la tarea.
 * @param {object} task - El objeto de la tarea.
 * @param {string} userRole - El rol del usuario actual ('supervisor' o 'supervisado').
 * @param {Date} now - La fecha y hora actual para comparar con la hora límite.
 * @returns {string} - Una cadena de texto con el HTML de la tarjeta.
 */
export const renderTask = (task, userRole, now) => {
    const statusClass = task.status === 'completed' || task.status === 'validated' ? 'task-completed' : '';
    const isMandatory = task.isMandatory ? '<span class="mandatory-badge">Obligatorio</span>' : '';
    let specialStatusBadge = '';

    const deadline = task.deadline?.toDate();
    const deadlineTime = deadline ? deadline.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora';
    const isPastDeadline = deadline ? now > deadline : false;

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
    } else if (task.taskType === 'weekly-penalty') {
        specialStatusBadge = '<span class="penalty-badge" style="background-color: #8E44AD;">Penalidad Semanal</span>';
    } else if (task.status === 'pending_acceptance') {
        specialStatusBadge = '<span class="penalty-badge" style="background-color: #2196F3;">Pendiente de Aceptación</span>';
    }

    const proposalCounts = task.proposalCounts || { supervisor: 0, supervised: 0 };

    const getActionButtons = () => {
        if (task.taskType === 'weekly-penalty') {
            const evidenceCount = task.evidence?.length || 0;
            if (userRole === 'supervisado') {
                if (task.status === 'pending') {
                    return `<p>Fotos subidas: ${evidenceCount} / 7</p>
                            <button class="evidence-btn">📸 Subir Foto</button>
                            <button class="add-comment-btn">💬 Añadir Comentario</button>`;
                }
            } else if (userRole === 'supervisor') {
                 if (task.status === 'completed') {
                    return `<p>Fotos subidas: ${evidenceCount} / 7</p>
                            <button class="validate-btn">👍 Validar</button>
                            <button class="reject-btn">👎 Rechazar</button>
                            <button class="add-comment-btn">💬 Añadir Comentario</button>`;
                }
                 return `<p>Fotos subidas: ${evidenceCount} / 7</p>
                         <button class="add-comment-btn">💬 Añadir Comentario</button>`;
            }
        }
        
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
                    if (deadline && isPastDeadline) {
                        supervisedButtons += `<p class="status-expired">El tiempo para completar esta tarea ha expirado.</p>`;
                    } else {
                        supervisedButtons += `<button class="evidence-btn">📸 Subir Evidencia para Completar</button>`;
                    }
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

        if (userRole === 'supervisor') {
            let supervisorButtons = `<button class="add-comment-btn">💬 Añadir Comentario</button>`;
            if (deadline && isPastDeadline && task.status !== 'completed' && task.status !== 'validated') {
                supervisorButtons += `<p class="status-expired">El tiempo para completar esta tarea ha expirado.</p>`;
                return supervisorButtons;
            }
            
            switch (task.status) {
                case 'completed':
                    supervisorButtons += `
                        <button class="validate-btn">👍 Validar</button>
                        <button class="reject-btn">👎 Rechazar</button>
                        <button class="notify-third-party-btn" style="background-color: #FF9800; color: white;">🔔 Notificar a Terceros</button>
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
        
        if (task.status === 'notified_third_party') {
            return `<div class="status-notified">
                        <h4>🔔 Aviso a Terceros Enviado</h4>
                        <p>"${task.notificationDetails}"</p>
                    </div>`;
        }

        return '';
    };

    let taskContentHTML;
    const deadlineHTML = deadline ? `<p><strong>Hora Límite:</strong> <span class="${isPastDeadline ? 'status-expired' : ''}">${deadlineTime}</span></p>` : '';

    if (task.status === 'counter-proposed' && task.counterProposal) {
        taskContentHTML = `
            <h3>Negociación de Penalidad ${isMandatory} ${specialStatusBadge}</h3>
            ${deadlineHTML}
            <div class="negotiation-display">
                <div class="negotiation-column">
                    <h4>Propuesta Original</h4>
                    <p class="negotiation-title">${task.title}</p>
                    <p class="negotiation-description">${task.description}</p>
                </div>
                <div class="negotiation-column">
                    <h4>Contrapropuesta</h4>
                    <p class="negotiation-title">${task.counterProposal.title}</p>
                    <p class="negotiation-description">${task.counterProposal.description}</p>
                </div>
            </div>
        `;
    } else {
        const titlePrefix = task.taskType === 'penalty' ? 'Penalidad' : (task.taskType === 'weekly-penalty' ? `Penalidad Semanal (${task.day === 'saturday' ? 'Sábado' : 'Domingo'})` : 'Tarea');
        taskContentHTML = `
            <h3>${titlePrefix}: ${task.title} ${isMandatory} ${specialStatusBadge}</h3>
            ${task.taskType !== 'weekly-penalty' ? deadlineHTML : ''}
            <p>${task.description}</p>
        `;
    }
    
    let evidenceHTML = '';
    if (task.taskType === 'weekly-penalty' && task.evidence && task.evidence.length > 0) {
        evidenceHTML += '<h4>Evidencias:</h4><div class="evidence-gallery">';
        task.evidence.forEach(ev => {
            evidenceHTML += `<a href="${ev.url}" target="_blank"><img src="${ev.url}" width="50" alt="evidencia"></a>`;
        });
        evidenceHTML += '</div>';
    } else if (task.evidence?.url) {
        evidenceHTML = `<a href="${task.evidence.url}" target="_blank">Ver evidencia</a>`;
    }

    return `
        <div class="task-card ${statusClass}" data-id="${task.id}">
            ${taskContentHTML}
            <div class="task-actions">
                ${getActionButtons()}
            </div>
            <div class="task-comments-container"></div>
            ${evidenceHTML}
        </div>
    `;
};