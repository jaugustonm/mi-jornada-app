// Usamos los scripts de la versión "compat" que son compatibles con importScripts
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAc4bkHn3RmnTETblViWuv845EZPE9kdJg",
    authDomain: "mi-jornada-app.firebaseapp.com",
    projectId: "mi-jornada-app",
    storageBucket: "mi-jornada-app.appspot.com",
    messagingSenderId: "191095418136",
    appId: "1:191095418136:web:f2c8c703111b19c7e4426d"
};

// Inicializamos Firebase
firebase.initializeApp(firebaseConfig);

// Obtenemos la instancia de Messaging
const messaging = firebase.messaging();

// --- MANEJO DE NOTIFICACIONES EN SEGUNDO PLANO ---
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Mensaje recibido en segundo plano ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// --- LÓGICA DE CACHÉ (PWA) ---

const CACHE_NAME = 'mi-jornada-app-cache-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/animations.css',
  '/js/main.js',
  '/js/config/firebase-config.js',
  '/js/services/auth.js',
  '/js/services/firestore.js',
  '/js/services/cloudinary.js',
  '/js/services/time.js',
  '/js/ui/components.js'
];

// Instala el Service Worker y guarda los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto y guardando archivos locales.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activa el Service Worker y elimina cachés antiguos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ======================================================================
// CORRECCIÓN FINAL: Lógica de fetch más robusta
// ======================================================================
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en la caché, lo devuelve.
        if (response) {
          return response;
        }

        // Si no está en caché, lo busca en la red.
        return fetch(event.request).then(
          (networkResponse) => {
            // Si la petición es exitosa, la guardamos en caché para el futuro.
            // Solo cacheamos peticiones GET exitosas del mismo origen.
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            // Este catch maneja errores de red (cuando estás offline)
            console.error('Service Worker: Fallo al buscar el recurso en la red.', error);
            // Opcionalmente, podrías devolver una página de fallback aquí.
            // Por ahora, dejamos que el error se propague para que el navegador lo muestre.
            throw error;
        });
      })
  );
});