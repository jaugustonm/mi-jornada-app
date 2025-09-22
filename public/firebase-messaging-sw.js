// Importa e inicializa los servicios de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-sw.js";

const firebaseConfig = {
    apiKey: "AIzaSyAc4bkHn3RmnTETblViWuv845EZPE9kdJg",
    authDomain: "mi-jornada-app.firebaseapp.com",
    projectId: "mi-jornada-app",
    storageBucket: "mi-jornada-app.appspot.com",
    messagingSenderId: "191095418136",
    appId: "1:191095418136:web:f2c8c703111b19c7e4426d"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});