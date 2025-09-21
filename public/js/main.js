// ======================================================================
// ARCHIVO COMPLETO Y CORREGIDO: js/main.js
// VERSIÓN COMPLETA - Restaura todo el código original e implementa
// correctamente la agrupación de tareas por estado.
// ======================================================================

// --- IMPORTACIONES ---
import { onAuthState, login, logout } from './services/auth.js';
import {
    getTasks,
    getTasksByDate,
    updateDocument,
    createTask,
    getUserProfile,
    getTasksForReport,
    getAssignedTasks,
    getAssignedTasksByDate,
    saveDailyReport,
    getAssignedTasksForDate,
    getTasksForWeeklyReport,
    deleteTask,
    getTaskById,
    addCommentToTask, // NUEVO: Importamos la función de comentarios
    getTasksForTimeRange
} from './services/firestore.js';
import { renderTask } from './ui/components.js';
import { uploadImage } from './services/cloudinary.js';
import { getSecureTime } from './services/time.js';

// --- SELECCIÓN DE ELEMENTOS DEL DOM ---
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const addTaskButton = document.getElementById('add-task-button');
const addTaskModal = document.getElementById('add-task-modal');
const addTaskForm = document.getElementById('add-task-form');
const cameraModal = document.getElementById('camera-modal');
const cameraFeed = document.getElementById('camera-feed');
const photoCanvas = document.getElementById('photo-canvas');
const captureButton = document.getElementById('capture-button');
const uploadButton = document.getElementById('upload-button');
const commentModal = document.getElementById('comment-modal'); // NUEVO
const commentForm = document.getElementById('comment-form'); // NUEVO

// ELEMENTOS PARA EL REPORTE DIARIO
const generateReportButton = document.getElementById('generate-report-button');
const reportModal = document.getElementById('report-modal');
const reportContent = document.getElementById('report-content');
const reportModalTitle = document.getElementById('report-modal-title');
const closeReportButton = document.getElementById('close-report-button');
const reportActions = document.getElementById('report-actions');
const assignRewardButton = document.getElementById('assign-reward-button');
const rewardModal = document.getElementById('reward-modal');
const rewardForm = document.getElementById('reward-form');

// ELEMENTOS PARA REPORTES DE JORNADA
const generateMorningReportButton = document.getElementById('generate-morning-report-button');
const generateAfternoonReportButton = document.getElementById('generate-afternoon-report-button');


// ELEMENTOS PARA LA PENALIDAD
const penaltyActions = document.getElementById('penalty-actions');
const penaltyForm = document.getElementById('penalty-form');

// ELEMENTOS PARA EL REPORTE SEMANAL
const generateWeeklyReportButton = document.getElementById('generate-weekly-report-button');
const weeklyReportModal = document.getElementById('weekly-report-modal');
const weeklyReportContent = document.getElementById('weekly-report-content');
const closeWeeklyReportButton = document.getElementById('close-weekly-report-button');
const weeklyReportActions = document.getElementById('weekly-report-actions');

// ELEMENTOS PARA EL FILTRO DE FECHA
const dateFilter = document.getElementById('date-filter');
const todayButton = document.getElementById('today-button');
const selectedDateText = document.getElementById('selected-date-text');

// ELEMENTOS PARA NEGOCIACIÓN
const negotiationModal = document.getElementById('negotiation-modal');
const negotiationForm = document.getElementById('negotiation-form');
const negotiationModalTitle = document.getElementById('negotiation-modal-title');
const supervisorRejectionModal = document.getElementById('supervisor-rejection-options-modal');
const restoreOriginalPenaltyBtn = document.getElementById('restore-original-penalty-btn');
const proposeNewPenaltyBtn = document.getElementById('propose-new-penalty-btn');

// ELEMENTOS PARA LA ASISTENCIA DE IA
const aiAssistanceModal = document.getElementById('ai-assistance-modal');
const aiPromptContainer = document.getElementById('ai-prompt-container');
const finalPenaltyForm = document.getElementById('final-penalty-form');


// --- VARIABLES GLOBALES ---
let currentUser = null;
let currentUserProfile = null;
let currentTaskId = null; // Se mantiene para la cámara y otras acciones
let stream = null;
let unsubscribe = null;
let currentReportId = null;
let selectedDate = new Date(); // FECHA SELECCIONADA
let negotiationContext = {
    taskId: null,
    isSupervisorCounter: false
};


// --- FUNCIONES AUXILIARES PARA FECHAS ---

/**
 * Formatea una fecha para mostrarla de manera legible
 */
const formatDateForDisplay = (date) => {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
};

/**
 * Formatea una fecha para el input de tipo date
 */
const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
};

/**
 * Actualiza la visualización de la fecha seleccionada
 */
const updateSelectedDateDisplay = () => {
    selectedDateText.textContent = formatDateForDisplay(selectedDate);
    dateFilter.value = formatDateForInput(selectedDate);
};

/**
 * Obtiene los límites de la semana (Domingo 00:00:00.000 a Viernes 23:59:59.999)
 * @param {Date} date - Una fecha dentro de la semana.
 * @returns {object} - Objeto con startOfWeek y endOfWeek.
 */
const getWeekLimits = (date) => {
    const day = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday

    // Calcula el inicio de la semana (Domingo)
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - day); // Ir al domingo
    startOfWeek.setHours(0, 0, 0, 0);

    // Calcula el fin de la semana (Viernes)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5); // 0 (Dom) + 5 = 5 (Vie)
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
};

/**
 * Carga las tareas para la fecha seleccionada
 */
const loadTasksForSelectedDate = () => {
    if (unsubscribe) unsubscribe();

    if (!currentUser || !currentUser.uid || !currentUserProfile) return;

    console.log('Cargando tareas para fecha:', selectedDate);

    if (currentUserProfile.role === 'supervisor') {
        unsubscribe = getAssignedTasksByDate(currentUser.uid, selectedDate, displayTasks);
    } else {
        unsubscribe = getTasksByDate(currentUser.uid, selectedDate, displayTasks);
    }
};

// --- FUNCIONES PRINCIPALES ---

/**
 * Muestra las tareas en los contenedores correspondientes, agrupadas por estado.
 */
const displayTasks = (tasks) => {
    // Limpiamos todos los contenedores de tareas
    const containers = [
        'morning-tasks-pending', 'morning-tasks-completed',
        'afternoon-tasks-pending', 'afternoon-tasks-completed'
    ];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) container.innerHTML = '';
    });


    if (!currentUserProfile) return;

    if (tasks.length === 0) {
        const noTasksMessage = `
            <div class="task-card" style="text-align: center; color: #666;">
                <h3>No hay tareas para este día</h3>
                <p>No se han asignado tareas para la fecha seleccionada.</p>
            </div>
        `;
        // Colocamos el mensaje en la sección de pendientes de la mañana por defecto
        document.getElementById('morning-tasks-pending').innerHTML = noTasksMessage;
        return;
    }

    tasks.sort((a, b) => (a.deadline?.toDate() || 0) - (b.deadline?.toDate() || 0));

    tasks.forEach(task => {
        const deadlineHour = task.deadline?.toDate().getHours() || 12;
        const taskHTML = renderTask(task, currentUserProfile.role);

        // Determinamos si la tarea está completada o validada
        const isCompleted = task.status === 'completed' || task.status === 'validated';
        
        // Asignamos la tarea al contenedor correcto
        if (deadlineHour < 14) { // Tareas de la mañana
            if (isCompleted) {
                document.getElementById('morning-tasks-completed').innerHTML += taskHTML;
            } else {
                document.getElementById('morning-tasks-pending').innerHTML += taskHTML;
            }
        } else { // Tareas de la tarde
            if (isCompleted) {
                document.getElementById('afternoon-tasks-completed').innerHTML += taskHTML;
            } else {
                document.getElementById('afternoon-tasks-pending').innerHTML += taskHTML;
            }
        }
    });
};


/**
 * Abre la cámara para tomar fotos
 */
const openCamera = async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraFeed.srcObject = stream;
        cameraModal.classList.remove('hidden');
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        alert("No se pudo acceder a la cámara. Verifica los permisos.");
    }
};

/**
 * Cierra la cámara y detiene el stream
 */
const closeCamera = () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    cameraModal.classList.add('hidden');
    captureButton.style.display = 'inline-block';
    uploadButton.classList.add('hidden');
};

/**
 * Captura una foto de la cámara
 */
const capturePhoto = () => {
    const canvas = photoCanvas;
    const context = canvas.getContext('2d');

    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    context.drawImage(cameraFeed, 0, 0);

    captureButton.style.display = 'none';
    uploadButton.classList.remove('hidden');
};

/**
 * Sube la evidencia capturada
 */
const uploadEvidence = async () => {
    const canvas = photoCanvas;

    canvas.toBlob(async (blob) => {
        const imageUrl = await uploadImage(blob);

        if (imageUrl && currentTaskId) {
            await updateDocument('tasks', currentTaskId, {
                evidence: { url: imageUrl, uploadedAt: new Date() },
                status: 'completed'
            });

            alert("Evidencia subida exitosamente");
            closeCamera();
            currentTaskId = null;
        } else {
            alert("Error al subir la evidencia");
        }
    }, 'image/jpeg', 0.8);
};

/**
 * Genera el reporte para una jornada específica (mañana o tarde)
 */
const generateJornadaReport = async (jornada) => {
    if (!currentUser || !currentUserProfile) return;

    const now = await getSecureTime();
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    let startTime, endTime, reportTitle, isDefinitive;

    if (jornada === 'morning') {
        startTime = startOfDay;
        endTime = new Date(selectedDate);
        endTime.setHours(12, 0, 0, 0);
        reportTitle = "Reporte de Jornada - Mañana";
        isDefinitive = now.getHours() >= 12;
    } else { // afternoon
        startTime = new Date(selectedDate);
        startTime.setHours(12, 0, 0, 1);
        endTime = new Date(selectedDate);
        endTime.setHours(17, 0, 0, 0);
        reportTitle = "Reporte de Jornada - Tarde";
        isDefinitive = now.getHours() >= 17;
    }

    try {
        const tasks = await getTasksForTimeRange(currentUser.uid, startTime, endTime, currentUserProfile.role === 'supervisor');
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'validated').length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        reportModalTitle.textContent = reportTitle;

        let reportHTML = `
            <div class="report-stat">
                Fecha del reporte: <span>${formatDateForDisplay(selectedDate)}</span>
            </div>
            <div class="report-stat">
                Estado: <span>${isDefinitive ? 'Definitivo' : 'Parcial'}</span>
            </div>
            <div class="report-stat">
                Tareas completadas: <span>${completedTasks} / ${totalTasks}</span>
            </div>
            <div class="report-stat">
                Porcentaje de cumplimiento: <span>${percentage}%</span>
            </div>
        `;

        reportContent.innerHTML = reportHTML;
        reportActions.classList.add('hidden');

        // LÓGICA MODIFICADA: Mostrar penalidad solo si el reporte es definitivo y el cumplimiento es bajo
        if (isDefinitive && percentage < 80 && currentUserProfile.role === 'supervisor') {
            penaltyActions.classList.remove('hidden');
        } else {
            penaltyActions.classList.add('hidden');
        }

        reportModal.classList.remove('hidden');

    } catch (error) {
        console.error(`Error generando el reporte de ${jornada}:`, error);
        alert(`Error al generar el reporte de ${jornada}.`);
    }
};


/**
 * Genera el reporte del día seleccionado
 */
const generateReport = async () => {
    if (!currentUser || !currentUserProfile) return;

    let tasks = [];

    try {
        if (currentUserProfile.role === 'supervisor') {
            tasks = await getAssignedTasksForDate(currentUser.uid, selectedDate);
        } else {
            tasks = await getTasksForReport(currentUser.uid, selectedDate);
        }

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'validated').length;
        const mandatoryTasks = tasks.filter(t => t.isMandatory);
        const completedMandatory = mandatoryTasks.filter(t => t.status === 'completed' || t.status === 'validated').length;
        const unfulfilledMandatory = mandatoryTasks.filter(t => t.status !== 'completed' && t.status !== 'validated');

        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const canReceiveReward = unfulfilledMandatory.length === 0 && percentage >= 80;
        
        reportModalTitle.textContent = "Reporte de Cumplimiento Diario";

        let reportHTML = `
            <div class="report-stat">
                Fecha del reporte: <span>${formatDateForDisplay(selectedDate)}</span>
            </div>
            <div class="report-stat">
                Tareas completadas: <span>${completedTasks} / ${totalTasks}</span>
            </div>
            <div class="report-stat">
                Porcentaje de cumplimiento: <span>${percentage}%</span>
            </div>
            <div class="report-stat">
                Tareas obligatorias completadas: <span>${completedMandatory} / ${mandatoryTasks.length}</span>
            </div>
        `;

        // LÓGICA MODIFICADA: La penalidad ya no se gestiona aquí.
        if (currentUserProfile.role === 'supervisor') {
            if (canReceiveReward) {
                reportActions.classList.remove('hidden');
            } else {
                reportActions.classList.add('hidden');
            }
            penaltyActions.classList.add('hidden'); // Siempre oculto en el reporte diario
        } else {
            reportActions.classList.add('hidden');
            penaltyActions.classList.add('hidden');
        }

        reportContent.innerHTML = reportHTML;
        reportModal.classList.remove('hidden');

        const reportData = {
            userId: currentUserProfile.role === 'supervisor' ? currentUser.uid : currentUser.uid,
            date: selectedDate,
            totalTasks,
            completedTasks,
            percentage,
            mandatoryTasksCompleted: completedMandatory,
            totalMandatoryTasks: mandatoryTasks.length,
            canReceiveReward,
            createdAt: new Date()
        };

        currentReportId = await saveDailyReport(reportData);

    } catch (error) {
        console.error("Error generando el reporte:", error);
        alert("Error al generar el reporte");
    }
};

/**
 * Genera el reporte semanal
 */
const generateWeeklyReport = async () => {
    if (!currentUser || !currentUserProfile) return;

    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const isSupervisor = currentUserProfile.role === 'supervisor';
    let tasks = [];

    try {
        tasks = await getTasksForWeeklyReport(currentUser.uid, selectedDate, isSupervisor);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'validated').length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const { startOfWeek, endOfWeek } = getWeekLimits(selectedDate);
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const startDateDisplay = startOfWeek.toLocaleDateString('es-ES', dateOptions);
        const endDateDisplay = endOfWeek.toLocaleDateString('es-ES', dateOptions);

        let reportHTML = `
            <div class="report-stat">
                Semana: <span>${startDateDisplay.split(',')[0]} - ${endDateDisplay.split(',')[0]}</span>
            </div>
            <div class="report-stat">
                Estado: <span>${isSaturday ? 'Definitivo' : 'Parcial'}</span>
            </div>
            <div class="report-stat">
                Tareas completadas: <span>${completedTasks} / ${totalTasks}</span>
            </div>
            <div class="report-stat">
                Porcentaje de cumplimiento: <span>${percentage}%</span>
            </div>
        `;

        if (isSaturday && percentage < 80) {
            reportHTML += `
                <div class="penalty-section">
                    <h3>⚠️ Penalidad Activa</h3>
                    <p class="penalty-text">"El usuario deberá realizar todas las labores del hogar durante sábado y domingo, sin que nadie más las asuma en su lugar. El cumplimiento o incumplimiento afectará a todos, recordando que la negligencia siempre pesa sobre otros."</p>
                    <hr>
                    <p class="reflection-text">Reflexión: Esta carga no se limita al esfuerzo físico: busca enseñar que la fidelidad en lo pequeño libera, mientras que la evasión del deber esclaviza. Las tareas del hogar, asumidas en silencio y sin delegar, son un ejercicio de servicio, purificación y disciplina interior. Lo que parece castigo se transforma en camino de corrección y crecimiento en virtud.</p>
                </div>`;
        } else if (isSaturday) {
             reportHTML += `
                <div class="congrats-section">
                    <h3>¡Felicidades! 🎉</h3>
                    <p>Has superado el 80% de cumplimiento semanal. No hay penalidad y se considera un buen esfuerzo.</p>
                </div>`;
        }

        weeklyReportContent.innerHTML = reportHTML;
        weeklyReportModal.classList.remove('hidden');

    } catch (error) {
        console.error("Error generando el reporte semanal:", error);
        alert("Error al generar el reporte semanal");
    }
};

/**
 * Maneja la asignación de recompensas
 */
const handleRewardAssignment = async (e) => {
    e.preventDefault();
    const rewardText = document.getElementById('reward-text').value;

    if (currentReportId && rewardText.trim()) {
        await updateDocument('dailyReports', currentReportId, {
            reward: rewardText,
            rewardAssignedAt: new Date()
        });
        alert("Recompensa asignada exitosamente");
        rewardModal.classList.add('hidden');
        reportModal.classList.add('hidden');
        document.getElementById('reward-text').value = '';
    }
};

/**
 * Maneja la sugerencia de una nueva penalidad
 */
const handlePenaltySuggestion = async (e) => {
    e.preventDefault();
    const title = document.getElementById('penalty-title').value;
    const description = document.getElementById('penalty-description').value;
    const deadline = document.getElementById('penalty-deadline').value;
    const assignedToId = currentUserProfile.supervisingId;
    if (!assignedToId) {
        alert("Error: No se ha encontrado un usuario supervisado asignado a tu perfil.");
        return;
    }
    const penaltyData = {
        title, description, deadline: new Date(deadline), isMandatory: true,
        assignerId: currentUser.uid, assignedToId: assignedToId, status: 'pending_acceptance',
        taskType: 'penalty',
        negotiationHistory: [{
            proposer: 'supervisor',
            title,
            description,
            date: new Date(),
        }],
        proposalCounts: {
            supervisor: 1,
            supervised: 0,
        }
    };
    try {
        await createTask(penaltyData);
        alert("Penalidad sugerida exitosamente");
        reportModal.classList.add('hidden');
        penaltyForm.reset();
    } catch (error) {
        console.error("Error sugiriendo la penalidad:", error);
        alert("Error al sugerir la penalidad");
    }
};

/**
 * Maneja el envío del formulario de negociación (tanto del supervisado como del supervisor)
 */
const handleNegotiation = async (e) => {
    e.preventDefault();
    const title = document.getElementById('negotiation-title').value;
    const description = document.getElementById('negotiation-description').value;
    const { taskId, isSupervisorCounter } = negotiationContext;

    const taskDoc = await getTaskById(taskId);
    if (!taskDoc.exists()) {
        alert("La tarea ya no existe.");
        return;
    }
    const taskData = taskDoc.data();
    const proposalCounts = taskData.proposalCounts || { supervisor: 0, supervised: 0 };
    const negotiationHistory = taskData.negotiationHistory || [];
    const userRole = currentUserProfile.role;

    if (taskId && title && description) {
        const newProposal = {
            proposer: userRole,
            title,
            description,
            date: new Date(),
        };

        if (isSupervisorCounter) {
            await updateDocument('tasks', taskId, {
                title, description, status: 'pending_acceptance', counterProposal: null,
                negotiationHistory: [...negotiationHistory, newProposal],
                proposalCounts: {
                    ...proposalCounts,
                    supervisor: proposalCounts.supervisor + 1,
                },
            });
            alert("Contrapropuesta enviada al supervisado.");
        } else {
            await updateDocument('tasks', taskId, {
                status: 'counter-proposed',
                counterProposal: { title, description },
                negotiationHistory: [...negotiationHistory, newProposal],
                proposalCounts: {
                    ...proposalCounts,
                    supervised: proposalCounts.supervised + 1,
                },
            });
            alert("Contrapropuesta enviada al supervisor.");
        }
        negotiationModal.classList.add('hidden');
        negotiationForm.reset();
        negotiationContext = { taskId: null, isSupervisorCounter: false };
    }
};

/**
 * Muestra el modal de asistencia de IA solo al supervisor.
 * @param {object} task - El objeto de la tarea con el historial de negociación.
 * @param {string} taskId - El ID del documento de la tarea.
 */
const showAIAssistanceModal = (task, taskId) => { // **CORRECCIÓN AQUÍ**
    if (currentUserProfile.role !== 'supervisor') {
        alert("Se ha alcanzado el límite de propuestas. El supervisor definirá la penalidad final.");
        return;
    }
    let prompt = `El supervisor y el supervisado han llegado a un punto muerto en la negociación de una penalidad. A continuación se presenta el historial de propuestas. Analiza todas las alternativas y sugiere una penalidad justa y razonable que sirva como punto medio y fomente el crecimiento.\n\n`;
    const history = task.negotiationHistory || [];
    history.forEach((proposal, index) => {
        prompt += `Propuesta ${index + 1} (${proposal.proposer}):\n`;
        prompt += `Título: ${proposal.title}\n`;
        prompt += `Descripción: ${proposal.description}\n\n`;
    });

    aiPromptContainer.textContent = prompt;
    aiAssistanceModal.classList.remove('hidden');
    negotiationContext.taskId = taskId; // **CORRECCIÓN AQUÍ**
};


const handleFinalPenalty = async (e) => {
    e.preventDefault();
    const title = document.getElementById('final-penalty-title').value;
    const description = document.getElementById('final-penalty-description').value;
    const { taskId } = negotiationContext;

    if (taskId && title && description) {
        await updateDocument('tasks', taskId, {
            title,
            description,
            status: 'final_penalty',
            isMandatory: true,
        });
        alert("Penalidad final establecida.");
        aiAssistanceModal.classList.add('hidden');
        finalPenaltyForm.reset();
        negotiationContext = { taskId: null, isSupervisorCounter: false };
    }
};
/**
 * Maneja la creación de nuevas tareas
 */
const handleTaskCreation = async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const deadline = document.getElementById('task-deadline').value;
    const isMandatory = document.getElementById('task-mandatory').checked;
    const assignedToId = currentUserProfile.role === 'supervisor' ? currentUserProfile.supervisingId : currentUser.uid;
    if (currentUserProfile.role === 'supervisor' && !assignedToId) {
         alert("Error: No se ha encontrado un usuario supervisado asignado a tu perfil.");
         return;
    }
    const taskData = {
        title, description, deadline: new Date(deadline), isMandatory,
        assignerId: currentUser.uid, assignedToId: assignedToId, 
        status: currentUserProfile.role === 'supervisor' ? 'pending_acceptance' : 'pending',
        taskType: 'regular'
    };
    try {
        await createTask(taskData);
        alert("Tarea creada exitosamente");
        addTaskModal.classList.add('hidden');
        addTaskForm.reset();
    } catch (error) {
        console.error("Error creando la tarea:", error);
        alert("Error al crear la tarea");
    }
};

/**
 * Maneja el login de usuarios
 */
const handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await login(email, password);
    } catch (error) {
        console.error("Error en login:", error);
        alert("Error al iniciar sesión: " + error.message);
    }
};

// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    updateSelectedDateDisplay();

    // Formularios y botones principales
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', logout);
    addTaskForm.addEventListener('submit', handleTaskCreation);
    penaltyForm.addEventListener('submit', handlePenaltySuggestion);
    negotiationForm.addEventListener('submit', handleNegotiation);
    rewardForm.addEventListener('submit', handleRewardAssignment);
    finalPenaltyForm.addEventListener('submit', handleFinalPenalty);
    commentForm.addEventListener('submit', async (e) => { // NUEVO
        e.preventDefault();
        const commentText = document.getElementById('comment-text').value;
        if (commentText.trim() && currentTaskId && currentUser) {
            await addCommentToTask(currentTaskId, {
                text: commentText,
                authorId: currentUser.uid,
                authorEmail: currentUser.email
            });
            commentModal.classList.add('hidden');
            commentForm.reset();
            currentTaskId = null;
        }
    });


    // Filtros de fecha
    dateFilter.addEventListener('change', (e) => {
        // Aseguramos que la fecha se interprete en la zona horaria local
        const [year, month, day] = e.target.value.split('-').map(Number);
        selectedDate = new Date(year, month - 1, day);
        updateSelectedDateDisplay();
        loadTasksForSelectedDate();
    });
    todayButton.addEventListener('click', () => {
        selectedDate = new Date();
        updateSelectedDateDisplay();
        loadTasksForSelectedDate();
    });

    // Botones de modales y cámara
    addTaskButton.addEventListener('click', () => addTaskModal.classList.remove('hidden'));
    captureButton.addEventListener('click', capturePhoto);
    uploadButton.addEventListener('click', uploadEvidence);
    if(generateReportButton) { // El botón puede no existir
        generateReportButton.addEventListener('click', generateReport);
    }
    generateMorningReportButton.addEventListener('click', () => generateJornadaReport('morning'));
    generateAfternoonReportButton.addEventListener('click', () => generateJornadaReport('afternoon'));
    closeReportButton.addEventListener('click', () => reportModal.classList.add('hidden'));
    assignRewardButton.addEventListener('click', () => rewardModal.classList.remove('hidden'));
    generateWeeklyReportButton.addEventListener('click', generateWeeklyReport);
    closeWeeklyReportButton.addEventListener('click', () => weeklyReportModal.classList.add('hidden'));

    // Cerrar modales al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
            if (e.target === cameraModal) closeCamera();
        }
    });

    // --- MANEJADOR DE ACCIONES EN LAS TAREAS (DELEGACIÓN DE EVENTOS) ---
    appView.addEventListener('click', async (e) => {
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return;

        const taskId = taskCard.dataset.id;
        const taskDoc = await getTaskById(taskId);
        if (!taskDoc.exists()) return;
        const taskData = taskDoc.data();
        const proposalCounts = taskData.proposalCounts || { supervisor: 0, supervised: 0 };


        if (e.target.classList.contains('validate-btn')) {
            await updateDocument('tasks', taskId, { status: 'validated' });
        } else if (e.target.classList.contains('reject-btn')) {
            await updateDocument('tasks', taskId, { status: 'pending' });
        } else if (e.target.classList.contains('evidence-btn')) {
            currentTaskId = taskId;
            openCamera();
        } else if (e.target.classList.contains('add-comment-btn')) { // NUEVO
            currentTaskId = taskId;
            commentModal.classList.remove('hidden');
        } else if (e.target.classList.contains('accept-btn')) {
            await updateDocument('tasks', taskId, {
                status: 'pending',
                acceptedAt: new Date()
            });
            alert("Penalidad aceptada. Se ha agregado a tu lista de tareas.");
        } else if (e.target.classList.contains('decline-btn')) {
            await updateDocument('tasks', taskId, { status: 'rejected' });
            alert("Penalidad rechazada. Ahora puedes proponer una alternativa.");
        } else if (e.target.classList.contains('accept-task-btn')) {
            await updateDocument('tasks', taskId, {
                status: 'pending',
                acceptedAt: new Date()
            });
            alert("Tarea aceptada.");
        } else if (e.target.classList.contains('decline-task-btn')) {
            await updateDocument('tasks', taskId, { status: 'rejected' });
            alert("Tarea rechazada.");
        } else if (e.target.classList.contains('delete-task-btn')) {
            if (confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
                await deleteTask(taskId);
                alert("Tarea eliminada.");
            }
        } else if (e.target.classList.contains('propose-alternative-btn')) {
            if (proposalCounts.supervised >= 2) {
                await updateDocument('tasks', taskId, { status: 'negotiation_locked' });
                alert("Has alcanzado tu límite de propuestas. El supervisor establecerá la penalidad final.");
                return;
            }
            negotiationContext = { taskId, isSupervisorCounter: false };
            negotiationModalTitle.textContent = "Proponer Alternativa";
            negotiationModal.classList.remove('hidden');
        } else if (e.target.classList.contains('accept-proposal-btn')) {
            if (taskData.counterProposal) {
                await updateDocument('tasks', taskId, {
                    title: taskData.counterProposal.title,
                    description: taskData.counterProposal.description,
                    status: 'pending',
                    counterProposal: null
                });
                alert("Contrapropuesta aceptada.");
            }
        } else if (e.target.classList.contains('reject-proposal-btn')) {
            if (proposalCounts.supervisor >= 2) {
                showAIAssistanceModal(taskData, taskId); // **CORRECCIÓN AQUÍ**
                return;
            }
            negotiationContext.taskId = taskId;
            supervisorRejectionModal.classList.remove('hidden');
        } else if (e.target.classList.contains('set-final-penalty-btn')) {
            showAIAssistanceModal(taskData, taskId); // **CORRECCIÓN AQUÍ**
        }
    });

    // --- MANEJADORES PARA EL MODAL DE RECHAZO DEL SUPERVISOR ---
    restoreOriginalPenaltyBtn.addEventListener('click', async () => {
        if (!negotiationContext.taskId) return;
        await updateDocument('tasks', negotiationContext.taskId, { status: 'pending_acceptance', counterProposal: null });
        alert("Contrapropuesta rechazada. La penalidad ha sido restaurada a su estado original.");
        supervisorRejectionModal.classList.add('hidden');
        negotiationContext.taskId = null;
    });

    proposeNewPenaltyBtn.addEventListener('click', () => {
        if (!negotiationContext.taskId) return;
        negotiationContext.isSupervisorCounter = true;
        negotiationModalTitle.textContent = "Proponer Nueva Penalidad";
        supervisorRejectionModal.classList.add('hidden');
        negotiationModal.classList.remove('hidden');
    });
});

// --- OBSERVADOR DE AUTENTICACIÓN ---
onAuthState(async (user) => {
    if (user) {
        currentUser = user;
        currentUserProfile = await getUserProfile(user.uid);

        console.log("Perfil de usuario cargado:", currentUserProfile);

        if (currentUserProfile) {
            userEmail.textContent = user.email;
            userInfo.classList.remove('hidden');
            authView.classList.add('hidden');
            appView.classList.remove('hidden');
            loadTasksForSelectedDate();
            console.log('Usuario autenticado:', user.email, 'Rol:', currentUserProfile.role);
        } else {
            console.error('No se pudo cargar el perfil del usuario');
            alert('Error al cargar el perfil del usuario');
            logout();
        }
    } else {
        currentUser = null;
        currentUserProfile = null;
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        authView.classList.remove('hidden');
        appView.classList.add('hidden');
        userInfo.classList.add('hidden');
    }
});