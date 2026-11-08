/* Mes Soldes — service worker
   Toutes les applis partagent l'origine azertida.github.io :
   le préfixe "mes-soldes-" garantit qu'on ne touche qu'à NOS caches.
   → Incrémenter CACHE_NAME à chaque mise en ligne. */
const PREFIXE = "mes-soldes-";
const CACHE_NAME = PREFIXE + "v2";

const FICHIERS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(noms => Promise.all(
      noms.filter(n => n.startsWith(PREFIXE) && n !== CACHE_NAME)
          .map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Page : réseau d'abord (les mises à jour arrivent tout de suite), cache si hors ligne
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(r => {
        const copie = r.clone();
        caches.open(CACHE_NAME).then(c => c.put("./index.html", copie));
        return r;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Polices Google : cache d'abord, mises en cache à la première visite
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(req).then(enCache => enCache || fetch(req).then(r => {
        const copie = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copie));
        return r;
      }))
    );
    return;
  }

  // Fichiers de l'appli (même dossier) : cache d'abord
  if (url.origin === location.origin && url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) {
    e.respondWith(caches.match(req).then(enCache => enCache || fetch(req)));
  }
});
