const CACHE_NAME = "shattered-realm-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=10",
  "./game.js?v=10",
  "./phaser-dragon.js?v=10",
  "./assets/phaser/dragonfire-background-board.jpg",
  "./assets/phaser/shield-intact.png",
  "./assets/phaser/shield-cracked.png",
  "./assets/phaser/shield-shattered.png",
  "./assets/phaser/ember-relic.png",
  "./assets/phaser/fireball.png",
  "./assets/phaser/dragon-launcher.png",
  "./assets/phaser/flame-burst.png",
  "./assets/phaser/frost-burst.png",
  "./manifest.webmanifest",
  "./icons/shattered-realm-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
