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
  static async fetchRestaurants() {
    try {
      // Create transaction to get restaurants from db
      const db = await dbPromise;
      const tx = db.transaction('restaurants-store', 'readonly');
      const store = tx.objectStore('restaurants-store');
      // Use getAll method to return array of objects in store
      const restaurants = await store.getAll();
      // console.log("fetchR restaurants: ", restaurants);
      if (restaurants.length !== 0) {
        return restaurants;
      } else {
        // Fetch from server
        // console.log("fetching from server");
        DBHelper.serveRestaurants();
      }
    }
    catch(error) {
      console.error("Error while fetching from DB: ", error);
    }
  }

  /**********    Serve all restaurants    **********/
  static async serveRestaurants() {
    try {
      const fetchAll = new Request(DBHelper.DATABASE_URL);
      const response = await fetch(fetchAll);
      if (response.ok) {
        const restaurants = await response.json();
        // console.log("restaurants served: ", restaurants);
        DBHelper.addRestaurants(restaurants);
        return restaurants;
      }
      throw new Error(`Request failed. Returned status of: ${response.status}`);
    }
    catch(error) {
      console.error("Error while serving restaurants: ", error);
    }
  }

  /**********    Add served restaurants to DB    **********/
  static async addRestaurants(restaurants) {
    try {
      // console.log("running addR");
      // Create transaction to put restaurants into db
      const db = await dbPromise;
      // console.log("db is: ", db);
      // TODO: the error is here.  figure out why.
      const tx = db.transaction('restaurants-store', 'readwrite');
      const store = tx.objectStore('restaurants-store');
      // console.log("restaurants to add: ", restaurants);
      restaurants.forEach(restaurant => {
        // console.log("adding to DB: ", restaurant.id);
        store.put(restaurant);
        return tx.complete;
      });
    }
    catch(error) {
      console.error("Error while adding restaurants to DB:", error);
    }
  }

  /**********    Fetch restaurants by filtered value    **********/
  static async fetchRestaurantsByFilter(cuisine, neighborhood) {
    try {
      const restaurants = await DBHelper.fetchRestaurants();
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      // console.log("fetchRBF results are: ", results);
      return results;
    }
    catch(error) {
      console.error("Error while fetching by filter: ", error);
    }
  }

  /**********    Fetch a restaurant by its ID    **********/
  static async fetchRestaurantById(id) {
    try {
      const restaurants = await DBHelper.fetchRestaurants();
      const restaurant = restaurants.find(r => r.id == id);
      if (restaurant) {
        // console.log("found restaurant by id: ", restaurant);
        return restaurant;
      } else {
        console.error("Restaurant doesn't exist");
      }
    }
    catch(error) {
      console.error("Error while fetching restaurant by id: ", error);
    }
  }

  /**********    Fetch all neighborhoods    **********/
  static async fetchNeighborhoods() {
    try {
      const restaurants = await DBHelper.fetchRestaurants();
      // console.log("restaurants for fetchN are: ", restaurants);
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
      if (neighborhoods) {
        return uniqueNeighborhoods;
      } else {
        console.error("Unable to find neighborhoods");
      }
    }
    catch(error) {
      console.error("Error while fetching neighborhoods: ", error);
    }
  }

  /**********    Fetch all cuisines    **********/
  static async fetchCuisines() {
    try {
      const restaurants = await DBHelper.fetchRestaurants();
      // console.log("restaurants for fetchC are: ", restaurants);
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
      if (cuisines) {
        return uniqueCuisines;
      } else {
        console.error("Unable to find cuisines");
      }
    }
    catch(error) {
      console.error("Error while fetching cuisines: ", error);
    }
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
    const markerUrl = DBHelper.urlForRestaurant(restaurant);
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
        alt: restaurant.name,
        url: markerUrl
      });
    marker.addTo(newMap);
    return marker;
  }

  /**************************************************************************/
  /*                           Favorites Functions                          */
  /**************************************************************************/

  // NOTE: Called from handleClickFavorite() (ri.js)
  /**********    Add/remove favorited restaurant from DB   **********/
  static async toggleFavorite(id) {
    try {
      // Determine current status of is_favorite
      const restaurant = await DBHelper.fetchRestaurantById(id);
      // Toggle status of is_favorite
      let status = (restaurant.is_favorite == true) ? false : true;
      console.log("Toggling status to: ", status);
      restaurant.is_favorite = status;
      // Update the DB with the current status
      const db = await dbPromise;
      const tx = db.transaction('restaurants-store', 'readwrite');
      const store = tx.objectStore('restaurants-store');
      store.put(restaurant);
      return tx.complete;
    }
    catch(error) {
      console.error("Error while toggling favorite: ", error);
    }
  }

  // TODO: Fix filter results dropdowns so they don't display dupes
  // NOTE: Called from updateFavorites() (main.js)
  /**********    Collect restaurants that are favorites    **********/
  static async getFavorites() {
    try {
      let restaurants = await DBHelper.fetchRestaurants();
      restaurants = restaurants.filter(r => r.is_favorite == true);
      console.log(restaurants);
      if (restaurants.length == 0) {
        alert('No restaurants have been favorited.  Please click the favorite icon for a restaurant to do so.');
        document.getElementById('faves-checkbox').checked = false;
        return null;
      } else {
        return restaurants;
      }
    }
    catch(error) {
      console.error("Error while getting favorites: ", error);
    }
  }

  // The very end
}
