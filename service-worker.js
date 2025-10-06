// service-worker.js
const CACHE_NAME = 'candy-match-cache-v2';
const OFFLINE_URLS = [
  '/', '/index.html',
  // images (list your uploaded images)
  '/images/candy1.png','/images/candy2.png','/images/candy3.png','/images/candy4.png','/images/candy5.png',
  '/images/candy6.png','/images/candy7.png','/images/candy8.png','/images/candy9.png','/images/candy10.png',
  '/images/donut.png','/images/bomb.jpg',
  // sfx (audio)
  '/sfx/move.mp3','/sfx/pop.mp3','/sfx/match.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(OFFLINE_URLS.map(url => {
        return fetch(url, {mode:'no-cors'}).then(resp => {
          return cache.put(url, resp.clone()).catch(()=>{});
        }).catch(()=>{});
      }));
    }).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k=>k !== CACHE_NAME).map(k=>caches.delete(k))
    )).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Handle navigation requests (like index.html)
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c=>c.put('/index.html', copy));
        return resp;
      }).catch(()=> caches.match('/index.html'))
    );
    return;
  }

  // Cache images, sounds, scripts, styles
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/sfx/') || req.destination === 'image' || req.destination === 'audio' || req.destination === 'script' || req.destination === 'style') {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(networkResp => {
        return caches.open(CACHE_NAME).then(cache=>{ cache.put(req, networkResp.clone()); return networkResp; }).catch(()=>networkResp);
      }).catch(()=>cached))
    );
    return;
  }

  // Default fallback
  event.respondWith(
    fetch(req).catch(()=> caches.match(req))
  );
});
