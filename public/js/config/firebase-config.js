// ======================================================================
// VERSIÓN CORREGIDA Y FUNCIONAL
// ======================================================================

// 1. Importamos las funciones desde las URLs completas del CDN de Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// 2. Usamos tu configuración real que proporcionaste.
//    (Recuerda no compartirla públicamente de nuevo).
const firebaseConfig = {
  apiKey: "AIzaSyAc4bkHn3RmnTETblViWuv845EZPE9kdJg",
  authDomain: "mi-jornada-app.firebaseapp.com",
  projectId: "mi-jornada-app",
  storageBucket: "mi-jornada-app.appspot.com", // Corregí el nombre del bucket, usualmente es .appspot.com
  messagingSenderId: "191095418136",
  appId: "1:191095418136:web:f2c8c703111b19c7e4426d"
  // No necesitamos measurementId para esta app, así que lo podemos omitir.
};

// 3. Inicializamos Firebase y exportamos los servicios que necesitamos.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Nota: He quitado la parte de 'Analytics' porque no la estamos usando
// en nuestra aplicación y es mejor mantener el código limpio y enfocado.