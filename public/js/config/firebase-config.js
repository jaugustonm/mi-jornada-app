// ======================================================================
// VERSIÓN CORREGIDA Y FUNCIONAL
// ======================================================================

// 1. Importamos las funciones desde las URLs completas del CDN de Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging.js";

// 2. Usamos tu configuración real que proporcionaste.
const firebaseConfig = {
  apiKey: "AIzaSyAc4bkHn3RmnTETblViWuv845EZPE9kdJg",
  authDomain: "mi-jornada-app.firebaseapp.com",
  projectId: "mi-jornada-app",
  storageBucket: "mi-jornada-app.appspot.com",
  messagingSenderId: "191095418136",
  appId: "1:191095418136:web:f2c8c703111b19c7e4426d"
};

// 3. Inicializamos Firebase y exportamos los servicios que necesitamos.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);