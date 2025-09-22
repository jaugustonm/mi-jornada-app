// ======================================================================
// ARCHIVO ACTUALIZADO: js/services/firestore.js
// La función `getTasksBySupervisor` obtiene todas las tareas relevantes.
// ======================================================================

import { db } from '../config/firebase-config.js';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    Timestamp,
    getDoc,
    getDocs,
    deleteDoc,
    orderBy,
    or,
    and // NUEVO: Para combinar todas las cláusulas where
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- REFERENCIAS A COLECCIONES ---
const tasksCollection = collection(db, 'tasks');
const usersCollection = collection(db, 'users');
const reportsCollection = collection(db, 'dailyReports');
const commentsCollection = collection(db, 'taskComments');

// --- FUNCIONES AUXILIARES PARA FECHAS ---

/**
 * Convierte una fecha a los límites del día (inicio y fin)
 * @param {Date} date - La fecha a convertir
 * @returns {object} - Objeto con startOfDay y endOfDay
 */
const getDayLimits = (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
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

// --- FUNCIONES PARA COMENTARIOS ---

/**
 * Añade un comentario a una tarea.
 * @param {string} taskId - El ID de la tarea.
 * @param {object} commentData - Datos del comentario (texto, autor, etc.).
 * @returns {Promise}
 */
export const addCommentToTask = (taskId, commentData) => {
    return addDoc(commentsCollection, {
        taskId,
        ...commentData,
        createdAt: Timestamp.now()
    });
};

/**
 * Obtiene los comentarios de una tarea en tiempo real.
 * @param {string} taskId - El ID de la tarea.
 * @param {function} callback - Función que se ejecuta con los comentarios.
 * @returns {function} - Función para cancelar la suscripción.
 */
export const getCommentsForTask = (taskId, callback) => {
    const q = query(
        commentsCollection,
        where("taskId", "==", taskId),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        callback(comments);
    });
};


// --- FUNCIONES PARA REPORTES ---

/**
 * Guarda un resumen del reporte diario en la base de datos.
 * @param {object} reportData - Los datos del reporte a guardar.
 * @returns {Promise<string>} - El ID del нового documento de reporte.
 */
export const saveDailyReport = async (reportData) => {
    const docRef = await addDoc(reportsCollection, reportData);
    return docRef.id;
};

/**
 * Actualiza un documento en cualquier colección.
 * @param {string} collectionName - Nombre de la colección ('tasks' o 'dailyReports').
 * @param {string} docId - El ID del documento a actualizar.
 * @param {object} dataToUpdate - Objeto con los campos a actualizar.
 * @returns {Promise}
 */
export const updateDocument = (collectionName, docId, dataToUpdate) => {
    const docRef = doc(db, collectionName, docId);
    return updateDoc(docRef, dataToUpdate);
};

// --- FUNCIONES PARA TAREAS ---

/**
 * Obtiene una tarea específica por su ID.
 * @param {string} taskId - El ID de la tarea.
 * @returns {Promise<DocumentSnapshot>} - El snapshot del documento de la tarea.
 */
export const getTaskById = (taskId) => {
    const docRef = doc(db, 'tasks', taskId);
    return getDoc(docRef);
};


/**
 * Obtiene TODAS las tareas de un usuario (o asignadas por supervisor) para una semana específica (Domingo-Viernes).
 * @param {string} userId - El ID del usuario/supervisor.
 * @param {Date} date - Una fecha dentro de la semana para la cual se quieren obtener las tareas.
 * @param {boolean} isSupervisor - Indica si se buscan tareas asignadas (supervisor) o propias (supervisado).
 * @returns {Promise<Array>} - Una promesa que resuelve con un array de tareas.
 */
export const getTasksForWeeklyReport = async (userId, date, isSupervisor) => {
    const { startOfWeek, endOfWeek } = getWeekLimits(date);

    const fieldToQuery = isSupervisor ? "assignerId" : "assignedToId";

    const q = query(
        tasksCollection,
        where(fieldToQuery, "==", userId),
        where("deadline", ">=", startOfWeek),
        where("deadline", "<=", endOfWeek)
    );

    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
    });
    return tasks;
};

/**
 * Obtiene las tareas asignadas por un supervisor en una fecha específica.
 * @param {string} assignerId - El ID del supervisor que asignó las tareas.
 * @param {Date} date - La fecha para la cual se quieren obtener las tareas.
 * @returns {Promise<Array>} - Una promesa que resuelve con un array de tareas.
 */
export const getAssignedTasksForDate = async (assignerId, date) => {
    const { startOfDay, endOfDay } = getDayLimits(date);

    const q = query(
        tasksCollection,
        where("assignerId", "==", assignerId),
        where("deadline", ">=", startOfDay),
        where("deadline", "<=", endOfDay)
    );

    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
    });
    return tasks;
};

/**
 * FUNCIÓN ACTUALIZADA: Obtiene las tareas asignadas por un supervisor para una fecha específica (tiempo real).
 * @param {string} assignerId - El ID del supervisor.
 * @param {Date} selectedDate - La fecha seleccionada.
 * @param {function} callback - Función que se ejecuta cuando hay cambios.
 * @returns {function} - Función para cancelar la suscripción.
 */
export const getAssignedTasksByDate = (assignerId, selectedDate, callback) => {
    const { startOfDay, endOfDay } = getDayLimits(selectedDate);

    const q = query(
        tasksCollection,
        where("assignerId", "==", assignerId),
        where("deadline", ">=", startOfDay),
        where("deadline", "<=", endOfDay)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        callback(tasks);
    });
    return unsubscribe;
};

/**
 * Obtiene las tareas asignadas por un supervisor (todas las fechas - tiempo real).
 * @param {string} assignerId - El ID del supervisor.
 * @param {function} callback - Función que se ejecuta cuando hay cambios.
 * @returns {function} - Función para cancelar la suscripción.
 */
export const getAssignedTasks = (assignerId, callback) => {
    const q = query(tasksCollection, where("assignerId", "==", assignerId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        callback(tasks);
    });
    return unsubscribe;
};

/**
 * Obtiene las tareas de un usuario para generar reportes (una sola consulta).
 * @param {string} userId - El ID del usuario.
 * @param {Date} date - La fecha para filtrar las tareas.
 * @returns {Promise<Array>} - Las tareas del usuario en esa fecha.
 */
export const getTasksForReport = async (userId, date) => {
    const { startOfDay, endOfDay } = getDayLimits(date);

    const q = query(
        tasksCollection,
        where("assignedToId", "==", userId),
        where("deadline", ">=", startOfDay),
        where("deadline", "<=", endOfDay)
    );

    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
    });
    return tasks;
};

/**
 * Obtiene tareas dentro de un rango de tiempo específico para los reportes de jornada.
 * @param {string} userId - El ID del usuario (supervisado o supervisor).
 * @param {Date} startTime - La fecha y hora de inicio.
 * @param {Date} endTime - La fecha y hora de fin.
 * @param {boolean} isSupervisor - Verdadero si el usuario es un supervisor.
 * @returns {Promise<Array>} - Las tareas dentro del rango de tiempo.
 */
export const getTasksForTimeRange = async (userId, startTime, endTime, isSupervisor) => {
    const fieldToQuery = isSupervisor ? "assignerId" : "assignedToId";

    const q = query(
        tasksCollection,
        where(fieldToQuery, "==", userId),
        where("deadline", ">=", startTime),
        where("deadline", "<=", endTime)
    );

    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
    });
    return tasks;
};

/**
 * FUNCIÓN ACTUALIZADA: Obtiene las tareas de un usuario para una fecha específica (tiempo real).
 * @param {string} userId - El ID del usuario.
 * @param {Date} selectedDate - La fecha seleccionada.
 * @param {function} callback - Función que se ejecuta cuando hay cambios.
 * @returns {function} - Función para cancelar la suscripción.
 */
export const getTasksByDate = (userId, selectedDate, callback) => {
    const { startOfDay, endOfDay } = getDayLimits(selectedDate);

    const q = query(
        tasksCollection,
        where("assignedToId", "==", userId),
        where("deadline", ">=", startOfDay),
        where("deadline", "<=", endOfDay)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        callback(tasks);
    });
    return unsubscribe;
};

/**
 * Obtiene las tareas asignadas a un usuario (todas las fechas - tiempo real).
 * @param {string} userId - El ID del usuario.
 * @param {function} callback - Función que se ejecuta cuando hay cambios.
 * @returns {function} - Función para cancelar la suscripción.
 */
export const getTasks = (userId, callback) => {
    const q = query(tasksCollection, where("assignedToId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        callback(tasks);
    });
    return unsubscribe;
};

/**
 * NUEVO: Obtiene las tareas de un supervisor y su supervisado para una fecha específica (tiempo real).
 * @param {string} supervisorId - El ID del supervisor.
 * @param {string} supervisedId - El ID del supervisado.
 * @param {Date} selectedDate - La fecha seleccionada.
 * @param {function} callback - Función que se ejecuta cuando hay cambios.
 * @returns {function} - Función para cancelar la suscripción.
 */
export const getSupervisorTasksByDate = (supervisorId, supervisedId, selectedDate, callback) => {
    const { startOfDay, endOfDay } = getDayLimits(selectedDate);

    const q = query(
        tasksCollection,
        // CORRECCIÓN: Usar `and` para combinar todos los filtros
        and(
            or(
                where("assignerId", "==", supervisorId),
                where("assignedToId", "==", supervisedId)
            ),
            where("deadline", ">=", startOfDay),
            where("deadline", "<=", endOfDay)
        )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        callback(tasks);
    });
    return unsubscribe;
};

/**
 * Crea una nueva tarea.
 * @param {object} taskData - Los datos de la tarea.
 * @returns {Promise} - Promesa de la operación de creación.
 */
export const createTask = (taskData) => {
    const data = {
        ...taskData,
        createdAt: Timestamp.now(),
        status: taskData.status || 'pending',
        // MODIFICADO: Usa los datos del historial si se proveen, si no, usa un array vacío
        negotiationHistory: taskData.negotiationHistory || [],
        proposalCounts: taskData.proposalCounts || {
            supervisor: 0,
            supervised: 0,
        }
    };
    return addDoc(tasksCollection, data);
};


/**
 * Elimina una tarea por su ID.
 * @param {string} taskId - El ID de la tarea a eliminar.
 * @returns {Promise}
 */
export const deleteTask = (taskId) => {
    const docRef = doc(db, 'tasks', taskId);
    return deleteDoc(docRef);
};

// --- FUNCIONES PARA USUARIOS ---

/**
 * Obtiene el perfil de un usuario.
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<object|null>} - El perfil del usuario o null si no existe.
 */
export const getUserProfile = async (userId) => {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        return userDoc.data();
    } else {
        console.error("No se encontró el perfil del usuario.");
        return null;
    }
};