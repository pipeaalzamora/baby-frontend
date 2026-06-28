/* eslint-disable */
/* global importScripts, firebase */
// Service worker de Firebase Cloud Messaging para notificaciones en background.
// Usa la API "compat" porque los service workers no soportan módulos ES.
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// Mismo firebaseConfig que environment.ts / firebase.service.ts.
firebase.initializeApp({
  apiKey: 'AIzaSyCR8UtPh4STNoFW_VbDHd8XFSdU5cGeNAs',
  authDomain: 'proyectos-hobbys-495300.firebaseapp.com',
  projectId: 'proyectos-hobbys-495300',
  storageBucket: 'proyectos-hobbys-495300.firebasestorage.app',
  messagingSenderId: '1057417146171',
  appId: '1:1057417146171:web:ecb9368d3f7f40b16ed11e',
  measurementId: 'G-LHPSYHLPLL',
});

const messaging = firebase.messaging();

// Mensajes recibidos con la app en segundo plano.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'BabyApp';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/favicon.ico',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// Al tocar la notificación, enfoca o abre la app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    }),
  );
});
