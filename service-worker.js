self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("candy-v2").then(cache => cache.addAll([
      "./",
      "index.html",
      "css/home.css",
      "css/game.css",
      "js/home.js",
      "js/game.js"
    ]))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
