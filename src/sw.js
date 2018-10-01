/**********    Set up cache name/URL variables    **********/
const cache_name = 'reviews-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/manifest.json',
  '/css/styles.css',
  '/css/responsive.css',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js',
  '/img/map_full.jpg',
  '/img/icons-192.jpg',
  '/img/icons-512.jpg'
];

/**********    Open cache, add URLs, confirm assets are cached    **********/
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cache_name).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;

  // If statement used to get rid of most of the annoying errors
  if (requestUrl.includes('browser-sync')|| requestUrl.includes('unpkg') || requestUrl.includes('mapbox')) {
    return;
  }

  if (event.request.method === 'GET') {

    // To force SW to update reviews instead of collecting from cache
    if (requestUrl.startsWith('http://localhost:1337/reviews')) {
      caches.open(cache_name).then(cache => {
        return fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }

    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        // Fetch request and clone it
        let fetchRequest = event.request.clone();
        // Ensure valid/status ok
        return fetch(fetchRequest).then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          // Clone response to send one to cache and return other
          let responseToCache = response.clone();
          caches.open(cache_name).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      }).catch(error => {
        console.error("Fetch event failed:", event.request, error);
      })
    );
  }
  else {
    event.respondWith( fetch(event.request) );
  }
});

/**********    Tidy up the SW cache storage with loop deleting old caches.
 * Filter cacheNames to only select ones with same start ('reviews-')
 * that aren't the current cacheName (cache_name)    **********/
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('reviews-') &&
          cacheName != cache_name;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// NOTE: For using IDB here:
// self.importScripts('js/idb.js');
// self.importScripts('js/dbhelper.min.js');
