// ======================================================================
// ARCHIVO COMPLETO: js/main.js
// Con filtro de fecha y reporte semanal
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
    getTasksForWeeklyReport
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
const morningTasksContainer = document.getElementById('morning-tasks');
const afternoonTasksContainer = document.getElementById('afternoon-tasks');
const addTaskButton = document.getElementById('add-task-button');
const addTaskModal = document.getElementById('add-task-modal');
const addTaskForm = document.getElementById('add-task-form');
const cameraModal = document.getElementById('camera-modal');
const cameraFeed = document.getElementById('camera-feed');
const photoCanvas = document.getElementById('photo-canvas');
const captureButton = document.getElementById('capture-button');
const uploadButton = document.getElementById('upload-button');

// ELEMENTOS PARA EL REPORTE DIARIO
const generateReportButton = document.getElementById('generate-report-button');
const reportModal = document.getElementById('report-modal');
const reportContent = document.getElementById('report-content');
const closeReportButton = document.getElementById('close-report-button');
const reportActions = document.getElementById('report-actions');
const assignRewardButton = document.getElementById('assign-reward-button');
const rewardModal = document.getElementById('reward-modal');
const rewardForm = document.getElementById('reward-form');

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

// --- VARIABLES GLOBALES ---
let currentUser = null;
let currentUserProfile = null;
let currentTaskId = null;
let stream = null;
let unsubscribe = null;
let currentReportId = null;
let selectedDate = new Date(); // FECHA SELECCIONADA

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
    // Limpiar suscripción anterior si existe
    if (unsubscribe) unsubscribe();
    
    if (!currentUser || !currentUserProfile) return;
    
    console.log('Cargando tareas para fecha:', selectedDate);
    
    // Cargar tareas según el rol del usuario y la fecha seleccionada
    if (currentUserProfile.role === 'supervisor') {
        unsubscribe = getAssignedTasksByDate(currentUser.uid, selectedDate, displayTasks);
    } else {
        unsubscribe = getTasksByDate(currentUser.uid, selectedDate, displayTasks);
    }
};

// --- FUNCIONES PRINCIPALES ---

/**
 * Muestra las tareas en los contenedores correspondientes
 */
const displayTasks = (tasks) => {
    morningTasksContainer.innerHTML = '';
    afternoonTasksContainer.innerHTML = '';
    
    if (!currentUserProfile) return;

    // Si no hay tareas para el día seleccionado
    if (tasks.length === 0) {
        const noTasksMessage = `
            <div class="task-card" style="text-align: center; color: #666;">
                <h3>No hay tareas para este día</h3>
                <p>No se han asignado tareas para la fecha seleccionada.</p>
            </div>
        `;
        morningTasksContainer.innerHTML = noTasksMessage;
        return;
    }

    tasks.forEach(task => {
        const deadlineHour = task.deadline?.toDate().getHours() || 12;
        const taskHTML = renderTask(task, currentUserProfile.role);
        if (deadlineHour < 14) {
            morningTasksContainer.innerHTML += taskHTML;
        } else {
            afternoonTasksContainer.innerHTML += taskHTML;
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
        
        if (unfulfilledMandatory.length > 0) {
            reportHTML += `
                <h3>Tareas obligatorias no cumplidas:</h3>
                <ul class="report-unfulfilled-list">
                    ${unfulfilledMandatory.map(task => `<li>${task.title}</li>`).join('')}
                </ul>
            `;
        }
        
        if (canReceiveReward && currentUserProfile.role === 'supervisor') {
            reportActions.classList.remove('hidden');
        } else {
            reportActions.classList.add('hidden');
        }
        
        reportContent.innerHTML = reportHTML;
        reportModal.classList.remove('hidden');
        
        // Guardar el reporte en la base de datos
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
    
    // 1. Obtener la hora actual para determinar el día de la semana
    const today = new Date(); 
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const isSaturday = dayOfWeek === 6;
    
    // 2. Obtener tareas de la semana de la fecha seleccionada (selectedDate)
    const isSupervisor = currentUserProfile.role === 'supervisor';
    let tasks = [];
    
    try {
        tasks = await getTasksForWeeklyReport(currentUser.uid, selectedDate, isSupervisor);
        
        // 3. Calcular estadísticas semanales
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'validated').length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        let reportHTML = '';
        
        // 4. Determinar el rango de la semana y el estado del reporte
        const { startOfWeek, endOfWeek } = getWeekLimits(selectedDate);
        
        // Formato para mostrar solo día y mes/año (ej: Domingo, 15 de Septiembre)
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const startDateDisplay = startOfWeek.toLocaleDateString('es-ES', dateOptions);
        const endDateDisplay = endOfWeek.toLocaleDateString('es-ES', dateOptions);
        
        reportHTML += `
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
        
        // 5. Lógica de Penalidad (solo si es Sábado y porcentaje < 80%)
        if (isSaturday && percentage < 80) {
            const penalty = `
                <div class="penalty-section">
                    <h3>⚠️ Penalidad Activa</h3>
                    <p class="penalty-text">"El usuario deberá realizar todas las labores del hogar durante sábado y domingo, sin que nadie más las asuma en su lugar. El cumplimiento o incumplimiento afectará a todos, recordando que la negligencia siempre pesa sobre otros."</p>
                    <hr>
                    <p class="reflection-text">Reflexión: Esta carga no se limita al esfuerzo físico: busca enseñar que la fidelidad en lo pequeño libera, mientras que la evasión del deber esclaviza. Las tareas del hogar, asumidas en silencio y sin delegar, son un ejercicio de servicio, purificación y disciplina interior. Lo que parece castigo se transforma en camino de corrección y crecimiento en virtud.</p>
                </div>
            `;
            reportHTML += penalty;
        } else if (isSaturday) {
             reportHTML += `
                <div class="congrats-section">
                    <h3>¡Felicidades! 🎉</h3>
                    <p>Has superado el 80% de cumplimiento semanal. No hay penalidad y se considera un buen esfuerzo.</p>
                </div>
            `;
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
 * Maneja la creación de nuevas tareas
 */
const handleTaskCreation = async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const deadline = document.getElementById('task-deadline').value;
    const isMandatory = document.getElementById('task-mandatory').checked;
    
    const taskData = {
        title,
        description,
        deadline: new Date(deadline),
        isMandatory,
        assignerId: currentUser.uid,
        assignedToId: currentUser.uid,
        status: 'pending'
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
    // Inicializar la fecha de hoy
    updateSelectedDateDisplay();
    
    // Autenticación
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', logout);
    
    // FILTRO DE FECHA
    dateFilter.addEventListener('change', (e) => {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        updateSelectedDateDisplay();
        loadTasksForSelectedDate();
    });
    
    // BOTÓN PARA IR A HOY
    todayButton.addEventListener('click', () => {
        selectedDate = new Date();
        updateSelectedDateDisplay();
        loadTasksForSelectedDate();
    });
    
    // Tareas
    addTaskButton.addEventListener('click', () => addTaskModal.classList.remove('hidden'));
    addTaskForm.addEventListener('submit', handleTaskCreation);
    
    // Cámara y evidencia
    captureButton.addEventListener('click', capturePhoto);
    uploadButton.addEventListener('click', uploadEvidence);
    
    // Reportes Diarios
    generateReportButton.addEventListener('click', generateReport);
    closeReportButton.addEventListener('click', () => reportModal.classList.add('hidden'));
    assignRewardButton.addEventListener('click', () => rewardModal.classList.remove('hidden'));
    rewardForm.addEventListener('submit', handleRewardAssignment);

    // Reportes Semanales
    generateWeeklyReportButton.addEventListener('click', generateWeeklyReport);
    closeWeeklyReportButton.addEventListener('click', () => weeklyReportModal.classList.add('hidden'));
    
    // Cerrar modales al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
            if (e.target === cameraModal) {
                closeCamera();
            }
        }
    });
    
    // Delegación de eventos para botones de tareas
    document.addEventListener('click', (e) => {
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return;
        
        const taskId = taskCard.dataset.id;
        
        if (e.target.classList.contains('complete-btn')) {
            updateDocument('tasks', taskId, { status: 'completed' });
        } else if (e.target.classList.contains('validate-btn')) {
            updateDocument('tasks', taskId, { status: 'validated' });
        } else if (e.target.classList.contains('reject-btn')) {
            updateDocument('tasks', taskId, { status: 'pending' });
        } else if (e.target.classList.contains('evidence-btn')) {
            currentTaskId = taskId;
            openCamera();
        }
    });
});

// --- OBSERVADOR DE AUTENTICACIÓN ---
onAuthState(async (user) => {
    if (user) {
        currentUser = user;
        currentUserProfile = await getUserProfile(user.uid);
        
        if (currentUserProfile) {
            // Mostrar información del usuario
            userEmail.textContent = user.email;
            userInfo.classList.remove('hidden');
            
            // Cambiar a la vista de la app
            authView.classList.add('hidden');
            appView.classList.remove('hidden');
            
            // Cargar tareas para la fecha seleccionada
            loadTasksForSelectedDate();
            
            console.log('Usuario autenticado:', user.email, 'Rol:', currentUserProfile.role);
        } else {
            console.error('No se pudo cargar el perfil del usuario');
            alert('Error al cargar el perfil del usuario');
        }
    } else {
        // Usuario no autenticado
        currentUser = null;
        currentUserProfile = null;
        
        // Limpiar suscripciones
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        
        // Volver a la vista de login
        authView.classList.remove('hidden');
        appView.classList.add('hidden');
        userInfo.classList.add('hidden');
    }
});