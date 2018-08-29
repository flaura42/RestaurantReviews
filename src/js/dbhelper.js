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

/**********    global variable for opening idb    **********/
const dbPromise = idb.open('restaurants-db', 1, upgradeDB => {
  if (!upgradeDB.objectStoreNames.contains('restaurants-store')) {
    const store = upgradeDB.createObjectStore('restaurants-store', {
      keyPath: 'id'
    });
  }
});

/**********    Common database helper functions    **********/
class DBHelper {
  /**************************************************************************/
  /*                           Pagewide Functions                           */
  /**************************************************************************/

  /**********    Database URL    **********/
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**********    Fetch all restaurants    **********/
  static fetchRestaurants(callback) {
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

  /**************************************************************************/
  /*                           Favorites Functions                          */
  /**************************************************************************/

/**********    Favorites Icon    **********/

  // NOTE: Works. Called from icon listener. Doesn't want catch
/**********    Check if favorite is true/false    **********/
  static checkForFavorite(id, callback) {
    DBHelper.fetchFavoriteById(id, restaurant => {
      if (restaurant.is_favorite == true) {
        console.log("Sending check");
        callback('/img/bookmark-check.png');
      } else {
        console.log("Sending plus");
        callback('/img/bookmark-plus.png');
      }
    });
  }

  // NOTE: Works. Called from icon listener. Doesn't want catch
  /**********    Find restaurant by ID    **********/
  static fetchFavoriteById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchDB(restaurants => {
      const restaurant = restaurants.find(r => r.id == id);
      if (restaurant) { // Got the restaurant
        console.log("Restaurant is: ", restaurant.id);
        callback(restaurant);
      } else { // Restaurant does not exist in the database
        console.error("Restaurant doesn't exist");
      }
    });
  }

  // NOTE: Works. Called from icon listener
  /**********    Fetch restaurants from DB   **********/
  static fetchDB(callback) {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants-store', 'readonly');
      const store = tx.objectStore('restaurants-store');
      return store.getAll();
    }).then(restaurants => {
      if (restaurants.length !== 0) {
        callback(restaurants);
      } else {
        // TODO: Decide if just return plus, since it should mean no bookmarks
        const restaurants = DBHelper.fetchRestaurants(callback);
        callback(restaurants);
      }
    }).catch(error => {
      console.error("Failed to fetch from DB. Fetching from server: ", error);
    });
  }

  // NOTE: Works. Called from icon listener
  /**********    Add/remove favorited restaurant from DB   **********/
  static toggleFavorite(id) {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants-store', 'readwrite');
      const store = tx.objectStore('restaurants-store');
      return store.openCursor();
    }).then(function logItems(cursor) {
      if (!cursor) {
        return;
      }
      if (cursor.value.id == id) {
        console.log("Updating #", id);
        const updateFavorite = cursor.value;
        (updateFavorite.is_favorite == false) ? updateFavorite.is_favorite = true : updateFavorite.is_favorite = false;
        console.log("Favorited = ", updateFavorite.is_favorite);
        cursor.update(updateFavorite);
      }
      return cursor.continue().then(logItems);
    }).then(() => {
      console.log("finished cursoring");
    }).catch(error => {
      console.error("Failed to fetch from DB: ", error);
    });
  }

  // NOTE: Works. Called from icon listener
  /**********    Change favorite icon    **********/
  static setFavorite(imgVersion) {
    const mark = document.getElementById('favorite');
    const check = document.createElement('img');
    check.setAttribute('id', 'favorite-img');
    if (imgVersion === 'check') {
      console.log("Changing to check");
      check.setAttribute('src', '/img/bookmark-check.png');
    } else {
      console.log("Changing to plus");
      check.setAttribute('src', '/img/bookmark-plus.png');
    }
    mark.replaceChild(check, mark.childNodes[0]);
  }

  // NOTE: Works. Called from updateFavorites()
  /**********    Collect restaurants that are favorites    **********/
  static getFavorites(callback) {
    DBHelper.fetchDB(restaurants => {
      let results = restaurants;
      results = results.filter(r => r.is_favorite == true);
      console.log("Results: ", results);
      // (results.length == 0) ? console.log('empty') : callback(results);
      if (results.length == 0) {
        alert('No restaurants have been favorited.  Please click the favorite icon for a restaurant to do so.');
        document.getElementById('faves-checkbox').checked = false;
      } else {
        callback(results);
      }
    });
  }

  // The very end
}
