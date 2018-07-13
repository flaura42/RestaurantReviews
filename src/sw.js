/**
 * sw.js written using lessons and info from:
 * https://jakearchibald.com/2014/offline-cookbook/
 * https://developers.google.com/web/fundamentals/primers/service-workers/?hl=en#register_a_service_worker
*/

/**
* Set up caching info with very creative variable names
* so they can be used in multiple event listeners.
//  */
const cache_name = 'reviews-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/css/styles.css',
  '/css/responsive.css',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js'
];

/**
 * Open a cache, add URLs to cache, and confirm assets are cached.
 */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cache_name)
    .then(function(cache) {
      console.log("Caches opened");
      return cache.addAll(urlsToCache);
    })
  );
});

/**
* Fetch returned cache responses cumulatively.
* Clone so can send one to browser and one to cache.
*/
self.addEventListener('fetch', function(event) {
  console.log('Fetched:', event.request.url);
// See if the request matches the cache, clone the request
  event.respondWith(
    caches.match(event.request)
    .then(function(response) {
      if (response) {
        console.log("Returning response:", response);
        return response;
      }
      var fetchRequest = event.request.clone();
      console.log("Returning fetch:", fetchRequest);
// Ensure valid/status ok/correct type (not 3rd party)
      return fetch(fetchRequest).then(
        function(response) {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            // console.log("Returning response:", response, response.status, response.type);
            return response;
          }
// Clone response to send one to cache and return other
          var responseToCache = response.clone();

          caches.open(cache_name)
          .then(function(cache) {
            cache.put(event.request, responseToCache);
          });
          console.log("Response cloned");
          return response;
        }
      );
    })
  );
});

/**
 * Tidy up the ServiceWorker cache storage with loop deleting old caches.
 * Filter cacheNames to only select ones with same start ('reviews-')
 * that aren't the current cacheName (cache_name).
 */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('reviews-') &&
          cacheName != cache_name;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
