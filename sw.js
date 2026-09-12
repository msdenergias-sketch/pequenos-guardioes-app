// Service worker: sempre busca a versão mais nova da página primeiro (network-first).
// Só usa o cache se estiver sem internet — assim o app nunca fica "preso" numa versão antiga.
const CACHE_NAME = "trilha-aventureiro-v1";
const CORE_ASSETS = ["./index.html", "./manifest.json", "./icon.png"];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(CORE_ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
  const isPage = event.request.mode === "navigate" || event.request.url.endsWith("index.html") || event.request.url.endsWith("/");

  if(isPage){
    // network-first: tenta buscar a versão nova; só cai pro cache se estiver offline
    event.respondWith(
      fetch(event.request).then(function(networkResp){
        if(networkResp && networkResp.ok){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, networkResp.clone()); });
        }
        return networkResp;
      }).catch(function(){ return caches.match(event.request); })
    );
    return;
  }

  // demais arquivos (ícone, manifest): cache-first, com atualização em segundo plano
  event.respondWith(
    caches.match(event.request).then(function(cached){
      const fetchPromise = fetch(event.request).then(function(networkResp){
        if(networkResp && networkResp.ok){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, networkResp.clone()); });
        }
        return networkResp;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});
