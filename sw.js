/* Standard visible Web Push; no silent pushes or caching of subscriptions. */
'use strict';
importScripts('./public-config.js');
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { /* Visible fallback below. */ }
  if (!payload || typeof payload !== 'object') payload = {};
  const configured = self.CHIAVAIL_PUSH.schedulerUrl;
  const url = payload.data && payload.data.url === configured ? payload.data.url : configured;
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'Chiavail Scheduler';
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof payload.body === 'string' && payload.body ? payload.body : '生活スケジューラからの通知です',
    icon: new URL('./icon-192.png', self.location.href).href,
    tag: typeof payload.tag === 'string' ? payload.tag : 'chiavail-notification',
    data: {url}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Only the configured scheduler is a navigation target, even with malformed payloads.
  const url = self.CHIAVAIL_PUSH.schedulerUrl;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url || '')) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    const existing = windows.find(client => client.url === url);
    if (existing) { try { return await existing.focus(); } catch (_) {} }
    return self.clients.openWindow(url);
  })());
});
