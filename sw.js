const CACHE_NAME = "shattered-realm-v43";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=43",
  "./game.js?v=43",
  "./phaser-dragon.js?v=43",
  "./assets/phaser/rune-board-v1.jpg",
  "./assets/phaser/rune-shrine-v1.png",
  "./assets/phaser/rune-red-v2.png",
  "./assets/phaser/rune-blue-v2.png",
  "./assets/phaser/rune-gold-v2.png",
  "./assets/phaser/rune-green-v2.png",
  "./assets/phaser/rune-violet-v2.png",
  "./assets/phaser/rune-white-v2.png",
  "./assets/phaser/rune-crimson-v2.png",
  "./assets/phaser/dragonfire-board-v2.jpg",
  "./assets/phaser/shield-intact-v2.png",
  "./assets/phaser/shield-cracked-v2.png",
  "./assets/phaser/shield-shattered-v2.png",
  "./assets/phaser/ember-relic-v2.png",
  "./assets/phaser/dragonfire-background-board.jpg",
  "./assets/phaser/shield-intact.png",
  "./assets/phaser/shield-cracked.png",
  "./assets/phaser/shield-shattered.png",
  "./assets/phaser/ember-relic.png",
  "./assets/phaser/dragon-launcher.png",
  "./assets/phaser/dragon-launcher-aim-v2.png",
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
