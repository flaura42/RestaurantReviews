/**********    Register serviceWorker    **********/
if (navigator.serviceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log("ServiceWorker registered:", registration);
      }, error => {
        console.error("ServiceWorker registration failed:", error);
      });
  });
}

// TODO rework IDB stuff to not require multiple opens

/**********    Common database helper functions    **********/
class DBHelper {

  /**********    Database URL    **********/
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static createDB() {
    return (
      // Create database: idb.open(name, version, upgradeCallback)
      idb.open('restaurants-db', 1, upgradeDB => {
        if (!upgradeDB.objectStoreNames.contains('restaurants-store')) {
          const store = upgradeDB.createObjectStore('restaurants-store', {
            keyPath: 'id'
          });
        }
      })
    );
  }

  /**********    Fetch all restaurants    **********/
  static fetchRestaurants(callback) {
    // Check for database, create if needed
    const dbPromise = DBHelper.createDB();
    // Create transaction to get restaurants from db
    dbPromise.then(db => {
      const tx = db.transaction('restaurants-store', 'readonly');
      const store = tx.objectStore('restaurants-store');
      // Use getAll method to return array of objects in store
      return store.getAll();
    }).then(restaurants => {
      if (restaurants.length !== 0) {
        callback(null, restaurants);
      } else {
        // Fetch from server
        DBHelper.serveRestaurants(callback);
      }
    })
      .catch(error => {
        callback(error, null);
      });
  }

  /**********    Serve all restaurants    **********/
  static serveRestaurants(callback) {
    const dbPromise = DBHelper.createDB();
    // Fetch restaurants from server
    const fetchAll = new Request(DBHelper.DATABASE_URL);
    return fetch(fetchAll)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(`Request failed. Returned status of: ${response.status}`);
      }).then(response => {
        const restaurants = response;
        // Create transaction to add restaurants to db
        dbPromise.then(db => {
          if (!db) {
            console.log("Missing DB!!");
            return;
          }
          const tx = db.transaction('restaurants-store', 'readwrite');
          const store = tx.objectStore('restaurants-store');
          restaurants.forEach(restaurant => {
            store.put(restaurant);
            return tx.complete;
          });
        });
        callback(null, restaurants);
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**********    Fetch restaurants by filtered value    **********/
  static fetchRestaurantsByFilter(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**********    Fetch a restaurant by its ID    **********/
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**********    Fetch all neighborhoods    **********/
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**********    Fetch all cuisines    **********/
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**********    Restaurant page URL    **********/
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**********    Restaurant image URL    **********/
  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph) {
      return (`/img/${restaurant.photograph}.jpg`);
    } else {
      return ('/img/noimage.jpg');
    }
  }

  /**********    Restaurant image srccset    **********/
  // TODO Figure out why image changes size too soon
  // EX: from 255 to 490 when img width is 180 and
  // from 490 to 800 when img width is 319
  // Doesn't appear to be related to window size
  static imageSrcsetForRestaurant(restaurant) {
    if (restaurant.photograph) {
      return (`/img/${restaurant.photograph}-255.jpg 255w, /img/${restaurant.photograph}-490.jpg 490w, /img/${restaurant.photograph}.jpg 800w`);
    } else {
      return ('/img/noimage-255.jpg 255w, /img/noimage-490.jpg 490w, /img/noimage.jpg 800w ');
    }
  }

  /**********    Map marker for a restaurant    **********/
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      });
    marker.addTo(newMap);
    return marker;
  }
}
