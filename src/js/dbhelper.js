/**********    Register serviceWorker    **********/
if (navigator.serviceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        // console.log("ServiceWorker registered:", registration);
      }, error => {
        console.error("ServiceWorker registration failed:", error);
      });
  });
}

/**********    Common database helper functions    **********/
class DBHelper {

  /**********    Database URL    **********/
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**********    Open idb and create objectStore if needed    **********/
  static openDB() {
    return (
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
    const dbPromise = DBHelper.openDB();
    // Create transaction to get restaurants from db
    dbPromise.then(db => {
      const tx = db.transaction('restaurants-store', 'readonly');
      const store = tx.objectStore('restaurants-store');
      // Use getAll method to return array of objects in store
      return store.getAll();
    }).then(restaurants => {
      if (restaurants.length !== 0) {
        callback(restaurants);
      } else {
        // Fetch from server
        DBHelper.serveRestaurants(callback);
      }
    }).catch(error => {
      console.error("Failed to fetch restaurants: ", error);
    });
  }

  /**********    Serve all restaurants    **********/
  static serveRestaurants(callback) {
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
        const dbPromise = DBHelper.openDB();
        dbPromise.then(db => {
          if (!db) {
            console.log("Missing DB!");
            return;
          }
          const tx = db.transaction('restaurants-store', 'readwrite');
          const store = tx.objectStore('restaurants-store');
          restaurants.forEach(restaurant => {
            store.put(restaurant);
            return tx.complete;
          });
        });
        callback(restaurants);
      }).catch(error => {
        console.error("Failed to serve restaurants: ", error);
      });
  }

  /**********    Fetch restaurants by filtered value    **********/
  static fetchRestaurantsByFilter(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants(restaurants => {
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      callback(results);
    });

  }

  /**********    Fetch a restaurant by its ID    **********/
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants(restaurants => {
      const restaurant = restaurants.find(r => r.id == id);
      if (restaurant) { // Got the restaurant
        callback(restaurant);
      } else { // Restaurant does not exist in the database
        console.error("Restaurant doesn't exist");
      }
    });
  }

  /**********    Fetch all neighborhoods    **********/
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants(restaurants => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
      if (neighborhoods) {
        callback(uniqueNeighborhoods);
      } else {
        console.error("Unable to find neighborhoods");
      }
    });
  }

  /**********    Fetch all cuisines    **********/
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants(restaurants => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
      if (cuisines) {
        callback(uniqueCuisines);
      } else {
        console.error("Unable to find cuisines");
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
