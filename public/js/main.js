// ======================================================================
// ARCHIVO ACTUALIZADO: js/main.js
// Con filtro de fecha para mostrar tareas del día seleccionado
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
    getAssignedTasksForDate 
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
const generateReportButton = document.getElementById('generate-report-button');
const reportModal = document.getElementById('report-modal');
const reportContent = document.getElementById('report-content');
const closeReportButton = document.getElementById('close-report-button');
const reportActions = document.getElementById('report-actions');
const assignRewardButton = document.getElementById('assign-reward-button');
const rewardModal = document.getElementById('reward-modal');
const rewardForm = document.getElementById('reward-form');

// ✅ NUEVOS ELEMENTOS PARA EL FILTRO DE FECHA
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
let selectedDate = new Date(); // ✅ NUEVA VARIABLE: fecha seleccionada

// --- FUNCIONES AUXILIARES ---

/**
 * ✅ NUEVA FUNCIÓN: Formatea una fecha para mostrarla de manera legible
 * @param {Date} date - La fecha a formatear
 * @returns {string} - La fecha formateada
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
 * ✅ NUEVA FUNCIÓN: Formatea una fecha para el input de tipo date
 * @param {Date} date - La fecha a formatear
 * @returns {string} - La fecha en formato YYYY-MM-DD
 */
const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
};

/**
 * ✅ NUEVA FUNCIÓN: Actualiza la visualización de la fecha seleccionada
 */
const updateSelectedDateDisplay = () => {
    selectedDateText.textContent = formatDateForDisplay(selectedDate);
    dateFilter.value = formatDateForInput(selectedDate);
};

/**
 * ✅ NUEVA FUNCIÓN: Carga las tareas para la fecha seleccionada
 */
const loadTasksForSelectedDate = () => {
    // Limpiar suscripción anterior si existe
    if (unsubscribe) unsubscribe();
    
    if (!currentUser || !currentUserProfile) return;
    
    // Cargar tareas según el rol del usuario y la fecha seleccionada
    if (currentUserProfile.role === 'supervisor') {
        unsubscribe = getAssignedTasksByDate(currentUser.uid, selectedDate, displayTasks);
    } else {
        unsubscribe = getTasksByDate(currentUser.uid, selectedDate, displayTasks);
    }
};

// --- FUNCIONES EXISTENTES (ACTUALIZADAS) ---

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

const openCamera = async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraFeed.srcObject = stream;
        cameraModal.classList.remove('hidden');
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        alert("No se pudo acceder a la cámara