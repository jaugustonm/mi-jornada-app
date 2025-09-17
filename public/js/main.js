// ======================================================================
// ARCHIVO COMPLETO Y DEFINITIVO: js/main.js
// ======================================================================

// --- IMPORTACIONES ---
import { onAuthState, login, logout } from './services/auth.js';
import { getTasks, updateDocument, createTask, getUserProfile, getTasksForReport, getAssignedTasks, saveDailyReport } from './services/firestore.js';
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

// --- VARIABLES GLOBALES ---
let currentUser = null;
let currentUserProfile = null;
let currentTaskId = null;
let stream = null;
let unsubscribe = null;
let currentReportId = null;

// --- FUNCIONES DE LA APLICACIÓN ---

const displayTasks = (tasks) => {
    morningTasksContainer.innerHTML = '';
    afternoonTasksContainer.innerHTML = '';
    if (!currentUserProfile) return;

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
        alert("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios en tu navegador.");
    }
};

const closeCamera = () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    cameraModal.classList.add('hidden');
};

const generateReport = async () => {
    let supervisedId;
    if (currentUserProfile.role === 'supervisor') {
        supervisedId = currentUserProfile.partnerId;
    } else {
        supervisedId = currentUser.uid;
    }

    if (!supervisedId) {
        alert("No se pudo identificar al usuario supervisado para generar el reporte.");
        return;
    }

    const tasks = await getTasksForReport(supervisedId, new Date());
    reportActions.classList.add('hidden');

    if (tasks.length === 0) {
        reportContent.innerHTML = `<p>No hay tareas asignadas para el día de hoy.</p>`;
        reportModal.classList.remove('hidden');
        return;
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed' || task.status === 'validated').length;
    const compliancePercentage = Math.round((completedTasks / totalTasks) * 100);

    const reportData = { supervisedId, reportDate: new Date(), compliancePercentage, totalTasks, completedTasks };
    currentReportId = await saveDailyReport(reportData);

    const unfulfilledTasks = tasks.filter(task => task.status !== 'completed' && task.status !== 'validated');
    let reportHTML = `
        <div class="report-stat">
            Porcentaje de Cumplimiento: <span>${compliancePercentage}%</span>
        </div>
        <p>${completedTasks} de ${totalTasks} tareas completadas.</p>
        <hr>
    `;

    if (unfulfilledTasks.length > 0) {
        reportHTML += `<h3>Tareas Incumplidas o Pendientes:</h3><ul class="report-unfulfilled-list">`;
        unfulfilledTasks.forEach(task => {
            reportHTML += `<li>${task.title} (Estado: ${task.status})</li>`;
        });
        reportHTML += `</ul>`;
    } else {
        reportHTML += `<p>¡Felicidades! Todas las tareas del día fueron completadas.</p>`;
    }

    reportContent.innerHTML = reportHTML;
    if (currentUserProfile.role === 'supervisor' && compliancePercentage >= 80) {
        reportActions.classList.remove('hidden');
    }
    reportModal.classList.remove('hidden');
};

const setupEventListeners = () => {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await login(email, password);
        } catch (error) {
            alert("Error al iniciar sesión: " + error.message);
        }
    });

    logoutButton.addEventListener('click', logout);

    appView.addEventListener('click', async (e) => {
        if (e.target.classList.contains('complete-btn')) {
            const taskId = e.target.closest('.task-card').dataset.id;
            await updateDocument('tasks', taskId, { status: 'completed' });
        }
        if (e.target.classList.contains('evidence-btn')) {
            const taskId = e.target.closest('.task-card').dataset.id;
            currentTaskId = taskId;
            openCamera();
        }
        if (e.target.classList.contains('validate-btn')) {
            const taskId = e.target.closest('.task-card').dataset.id;
            await updateDocument('tasks', taskId, { status: 'validated' });
        }
        if (e.target.classList.contains('reject-btn')) {
            const taskId = e.target.closest('.task-card').dataset.id;
            await updateDocument('tasks', taskId, { status: 'pending' });
        }
    });

    captureButton.addEventListener('click', () => {
        const context = photoCanvas.getContext('2d');
        photoCanvas.width = cameraFeed.videoWidth;
        photoCanvas.height = cameraFeed.videoHeight;
        context.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);
        cameraFeed.classList.add('hidden');
        captureButton.classList.add('hidden');
        photoCanvas.classList.remove('hidden');
        uploadButton.classList.remove('hidden');
    });

    uploadButton.addEventListener('click', async () => {
        uploadButton.disabled = true;
        uploadButton.textContent = 'Subiendo...';
        photoCanvas.toBlob(async (blob) => {
            try {
                const imageUrl = await uploadImage(blob);
                if (imageUrl) {
                    const secureTime = await getSecureTime();
                    const expiresAt = new Date(secureTime.getTime() + 24 * 60 * 60 * 1000);
                    await updateDocument('tasks', currentTaskId, { 'evidence.url': imageUrl, 'evidence.uploadedAt': secureTime, 'evidence.expiresAt': expiresAt });
                } else {
                    throw new Error("La URL de la imagen de Cloudinary es nula.");
                }
            } catch (error) {
                console.error("Error al subir o guardar la evidencia:", error);
            } finally {
                closeCamera();
                uploadButton.disabled = false;
                uploadButton.textContent = 'Subir Evidencia';
            }
        }, 'image/jpeg');
    });

    cameraModal.addEventListener('click', (e) => { if (e.target === cameraModal) closeCamera(); });
    addTaskButton.addEventListener('click', () => { addTaskModal.classList.remove('hidden'); });
    addTaskModal.addEventListener('click', (e) => { if (e.target === addTaskModal) addTaskModal.classList.add('hidden'); });
    
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserProfile || !currentUserProfile.partnerId) {
            alert("Error: No se encontró a quién asignar la tarea.");
            return;
        }
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const deadline = new Date(document.getElementById('task-deadline').value);
        const isMandatory = document.getElementById('task-mandatory').checked;
        const taskData = { title, description, deadline, isMandatory, assignerId: currentUser.uid, assignedToId: currentUserProfile.partnerId };
        try {
            await createTask(taskData);
            addTaskForm.reset();
            addTaskModal.classList.add('hidden');
        } catch (error) {
            console.error("Error al crear la tarea:", error);
        }
    });

    generateReportButton.addEventListener('click', generateReport);
    closeReportButton.addEventListener('click', () => { reportModal.classList.add('hidden'); });
    reportModal.addEventListener('click', (e) => { if (e.target === reportModal) reportModal.classList.add('hidden'); });

    assignRewardButton.addEventListener('click', () => { rewardModal.classList.remove('hidden'); });
    rewardModal.addEventListener('click', (e) => { if (e.target === rewardModal) rewardModal.classList.add('hidden'); });
    
    rewardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rewardText = document.getElementById('reward-text').value;
        if (!currentReportId) {
            alert("Error: No hay un reporte seleccionado.");
            return;
        }
        try {
            await updateDocument('dailyReports', currentReportId, { reward: rewardText });
            rewardForm.reset();
            rewardModal.classList.add('hidden');
            reportModal.classList.add('hidden');
        } catch (error) {
            console.error("Error al guardar la recompensa:", error);
        }
    });
};

const main = () => {
    onAuthState(async (user) => {
        if (unsubscribe) unsubscribe();
        if (user) {
            currentUser = user;
            currentUserProfile = await getUserProfile(user.uid);
            authView.classList.add('hidden');
            appView.classList.remove('hidden');
            document.getElementById('user-email').textContent = user.email;
            userInfo.classList.remove('hidden');
            if (currentUserProfile.role === 'supervisor') {
                unsubscribe = getAssignedTasks(user.uid, displayTasks);
            } else {
                unsubscribe = getTasks(user.uid, displayTasks);
            }
        } else {
            currentUser = null;
            currentUserProfile = null;
            authView.classList.remove('hidden');
            appView.classList.add('hidden');
            userInfo.classList.add('hidden');
            morningTasksContainer.innerHTML = '';
            afternoonTasksContainer.innerHTML = '';
        }
    });
};

main();
setupEventListeners();