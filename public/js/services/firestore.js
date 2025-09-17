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
    getDocs
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const tasksCollection = collection(db, 'tasks');
const usersCollection = collection(db, 'users');
const reportsCollection = collection(db, 'dailyReports'); // ✅ NUEVO

/**
 * Guarda un resumen del reporte diario en la base de datos.
 * @param {object} reportData - Los datos del reporte a guardar.
 * @returns {Promise<string>} - El ID del nuevo documento de reporte.
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


// ... (El resto de funciones: getAssignedTasks, getTasksForReport, etc. no cambian)
// ... Te los dejo aquí para que tengas el archivo completo
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

export const getTasksForReport = async (userId, date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
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

export const createTask = (taskData) => {
    const data = { ...taskData, createdAt: Timestamp.now(), status: 'pending' };
    return addDoc(tasksCollection, data);
};