self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: 'Simplify IVA CR',
    body: 'Tienes una actualización disponible.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url: '/',
  };

  try {
    const data = event.data.json();
    payload = {
      ...payload,
      ...data,
    };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';

  event.waitUntil(self.clients.openWindow(url));
});
