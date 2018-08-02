/**
 * sw.js written using lessons and info from:
 * https://jakearchibald.com/2014/offline-cookbook/
 * https://developers.google.com/web/fundamentals/primers/service-workers/?hl=en#register_a_service_worker
*/

/**
* Set up caching info as variables for use in multiple event listeners.
  */
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
  '/img/nomap.jpg',
  '/img/icons-512.jpg',
  '/img/icons-512.jpg'
];

/**
 * Open a cache, add URLs to cache, and confirm assets are cached.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cache_name).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

/**
* Fetch returned cache responses cumulatively.
*/
self.addEventListener('fetch', event => {

  // If statement used to get rid of most of the annoying errors
  const requestUrl = event.request.url;
  if (requestUrl.includes('unpkg') || requestUrl.includes('browser-sync') || requestUrl.includes('mapbox')) {
    return;
  }

  // Check for match in cache
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      // Fetch request and clone it
      let fetchRequest = event.request.clone();
      // Ensure valid/status ok/correct type
      return fetch(fetchRequest).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
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
      console.log("Fetch event failed", error);
    })
  );
});

/**
 * Tidy up the ServiceWorker cache storage with loop deleting old caches.
 * Filter cacheNames to only select ones with same start ('reviews-')
 * that aren't the current cacheName (cache_name).
 */
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
