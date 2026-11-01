/* Je Livre : service worker UNIQUE.
   Il sert à la fois à l'installation de l'app (PWA), à un secours hors-ligne léger
   et aux notifications push. Un seul fichier évite que deux service workers
   se remplacent l'un l'autre sur la même zone du site. */
importScripts('https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-app-compat.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-messaging-compat.min.js');

firebase.initializeApp({
  apiKey: "AIzaSyCHFPQQYQ8FcF011AkaHGunISYxiWm7iFY",
  authDomain: "je-livre-509fd.firebaseapp.com",
  projectId: "je-livre-509fd",
  storageBucket: "je-livre-509fd.firebasestorage.app",
  messagingSenderId: "591301628205",
  appId: "1:591301628205:web:c5cb55c7aea3c79effc3a4",
});
const messaging = firebase.messaging();

// Notification système quand le site n'est pas au premier plan.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Je Livre';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', data: payload.data || {} });
});

// Un clic sur la notification ramène sur le site.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) { if ('focus' in client) return client.focus(); }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

const CACHE = 'jl-shell-v1';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) { if (k !== CACHE) await caches.delete(k); }
    await self.clients.claim();
  })());
});

// Pages : réseau d'abord (toujours la dernière version), copie en secours si pas de connexion.
// Tout le reste (API, paiement, images, polices) passe directement par le réseau.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && new URL(req.url).origin === self.location.origin) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch (e) {
      const c = await caches.open(CACHE);
      return (await c.match(req)) || (await c.match(self.registration.scope)) ||
        new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#FFC629;color:#0D0D0C;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px;margin:0"><div><h2>Pas de connexion</h2><p>Reconnectez-vous à internet puis rouvrez Je Livre.</p></div>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  })());
});
