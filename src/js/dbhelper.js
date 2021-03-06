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
    upgradeDB.createObjectStore('restaurants-store', { keyPath: 'id' });
  }
  if (!upgradeDB.objectStoreNames.contains('reviews-store')) {
    upgradeDB.createObjectStore('reviews-store', { keyPath: 'id' });
  }
  if (!upgradeDB.objectStoreNames.contains('offline-store')) {
    upgradeDB.createObjectStore('offline-store', { keyPath: 'num', autoIncrement: true });
  }
});

/**********    Common database helper functions    **********/
class DBHelper {
  /**************************************************************************/
  /*                           Pagewide Functions                           */
  /**************************************************************************/

  /**********    Restaurants URL    **********/
  static get RESTAURANTS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**********    Reviews URL    **********/
  static get REVIEWS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }

  /**********    Local (app) URL    **********/
  static get LOCAL_URL() {
    const port = 8000; // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**********    Fetch all restaurants    **********/
  static async fetchRestaurants() {
    try {
      // Create transaction to get restaurants from db
      const db = await dbPromise;
      const tx = db.transaction('restaurants-store', 'readonly');
      const store = tx.objectStore('restaurants-store');
      // Use getAll method to return array of objects in store
      let restaurants = await store.getAll();
      if (restaurants.length !== 0) {
        return restaurants;
      } else {
        let restaurants = await DBHelper.serveRestaurants();
        return restaurants;
      }
    }
    catch(error) {
      console.error("Error while fetching from DB: ", error);
    }
  }

  /**********    Serve all restaurants    **********/
  static async serveRestaurants() {
    try {
      const fetchAll = new Request(DBHelper.RESTAURANTS_URL);
      const response = await fetch(fetchAll);
      if (response.ok) {
        const restaurants = await response.json();
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
      // Create transaction to put restaurants into db
      const db = await dbPromise;
      const tx = db.transaction('restaurants-store', 'readwrite');
      const store = tx.objectStore('restaurants-store');
      for (let i = 0; i < restaurants.length; i++) {
        store.put(restaurants[i]);
      }
      return tx.complete;
    }
    catch(error) {
      console.error("Error while adding restaurants to DB:", error);
    }
  }

  /**********    Fetch restaurants by filtered value    **********/
  static async fetchRestaurantsByFilter(neighborhood, cuisine) {
    try {
      const restaurants = await DBHelper.fetchRestaurants();
      let results = restaurants;
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
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
        return restaurant;
      } else {
        console.error("Restaurant id doesn't exist");
      }
    }
    catch(error) {
      console.error("Error while fetching restaurant by id: ", error);
    }
  }

  /**********    Fetch all neighborhoods    **********/
  static async fetchNeighborhoods() {
    try {
      let status = document.getElementById('show-favorites-icon').href.baseVal;
      const restaurants = (status == 'img/icons.svg#show-favorites-true') ? await DBHelper.checkFavorites() : await DBHelper.fetchRestaurants();
      if (restaurants == null) {
        console.error("No restaurants found");
        return null;
      }
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
      return uniqueNeighborhoods;
    }
    catch(error) {
      console.error("Error while fetching neighborhoods: ", error);
    }
  }

  /**********    Fetch all cuisines    **********/
  static async fetchCuisines() {
    try {
      let status = document.getElementById('show-favorites-icon').href.baseVal;
      const restaurants = (status == 'img/icons.svg#show-favorites-true') ? await DBHelper.checkFavorites() : await DBHelper.fetchRestaurants();
      if (restaurants == null) {
        console.error("No restaurants found");
        return null;
      }
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
      return uniqueCuisines;
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

  /**********    Ping url to see if functioning    **********/
  static async pingUrl(url) {
    try {
      console.log("Pinging URL: ", url);
      const status = await fetch(url).then(response => {
        if (response.ok) { return true; }
      });
      return status;
    }
    catch(error) {
      console.error("Error while pinging url: ", error);
      return false;
    }
  }

  /**********    Determine whether or not to display map/markers    **********/
  static async checkLocal() {
    try {
      let url =  new Request(DBHelper.RESTAURANTS_URL);
      const urlStatus = await fetch(url).then(response => {
        if (response.ok) { return true; }
      });
      let onlineStatus = navigator.onLine;
      if (urlStatus && onlineStatus) { return true; }
      else { return false; }
    }
    catch(error) {
      console.error("Error while checking local.  Appear to be offline: ", error);
      return false;
    }
  }

  /**********    Handle button change for mouseover/focus    **********/
  static handleHover(iconVersion, hoverVersion) {
    const icon = document.getElementById(`${iconVersion}-icon`);
    const hover = (hoverVersion) ? 'icon-hover' : 'icon';
    icon.className.baseVal = hover;
  }

  /**************************************************************************/
  /*                           Favorites Functions                          */
  /**************************************************************************/

  /**********    Add/remove favorited restaurant from DB   **********/
  static async toggleFavorite(id) {
    try {
      // Determine current status of is_favorite
      const restaurant = await DBHelper.fetchRestaurantById(id);
      // Toggle status of is_favorite
      let status = (restaurant.is_favorite == true) ? false : true;
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

  /**********    Fixes restaurant without 'is_favorite' value   **********/
  static async fixFavorite(id) {
    try {
      // Fetch restaurant data
      const restaurant = await DBHelper.fetchRestaurantById(id);
      // Change status of is_favorite to false
      restaurant.is_favorite = false;
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

  /**********    Collect restaurants that are favorites    **********/
  static async fetchFavorites(neighborhood, cuisine) {
    try {
      let restaurants = await DBHelper.fetchRestaurants();
      let favorites = restaurants.filter(r => r.is_favorite == true);
      if (neighborhood !== 'all') { // filter by neighborhood
        favorites = favorites.filter(r => r.neighborhood == neighborhood);
      }
      if (cuisine !== 'all') { // filter by cuisine
        favorites = favorites.filter(r => r.cuisine_type == cuisine);
      }
      return favorites;
    }
    catch(error) {
      console.error("Error while getting favorites: ", error);
    }
  }

  /**********    Return list of favorited restaurants    **********/
  static async checkFavorites() {
    try {
      let restaurants = await DBHelper.fetchRestaurants();
      let favorites = restaurants.filter(r => r.is_favorite == true);
      return favorites;
    }
    catch(error) {
      console.error("Error while checking favorites", error);
    }
  }

  /**********    Update server with current favorite status    **********/
  static async updateFavoriteStatus(id) {
    try {
      const restaurants = await DBHelper.fetchRestaurants();
      const restaurant = restaurants.find(r => r.id == id);
      console.log("Updating favorite status: ", restaurant);

      fetch(`${DBHelper.RESTAURANTS_URL}/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`, {
        method: 'PUT'
      }).then(response => {
        if (!response.ok) {
          console.error("Failed to update favorite status");
          return;
        }
      });
    }
    catch(error) {
      console.error("Error while updating favorite status", error);
    }
  }

  /**************************************************************************/
  /*                            Reviews Functions                           */
  /**************************************************************************/

  /**********    Collect reviews by restaurant id    **********/
  static async collectReviews(id) {
    try {
      const ping = await DBHelper.checkLocal();
      if (ping == true) {
        // Handle updating tasks
        DBHelper.updateFavoriteStatus(id);
        await DBHelper.fetchOfflineStore();
        // Return them thar reviews
        return DBHelper.serveReviewsById(id);
      } else {
        return DBHelper.fetchReviewsById(id);
      }
    }
    catch(error) {
      console.error("Error while collecting reviews: ", error);
    }
  }

  /**********    Serve reviews by restaurant id    **********/
  static async serveReviewsById(id) {
    try {
      const fetchReviews = new Request(`${DBHelper.REVIEWS_URL}?restaurant_id=${id}`);
      const response = await fetch(fetchReviews);
      if (response.ok) {
        const reviews = await response.json();
        DBHelper.updateReviewsDB(reviews);
        return reviews;
      } else {
        return DBHelper.fetchReviewsById(id);
      }
    }
    catch(error) {
      console.error("Error while fetching reviews by id: ", error);
      return DBHelper.fetchReviewsById(id);
    }
  }

  /**********    Fetch reviews by restaurant id    **********/
  static async fetchReviewsById(id) {
    try {
      // Create transaction to get restaurants from db
      const db = await dbPromise;
      const tx = db.transaction('reviews-store', 'readonly');
      const store = tx.objectStore('reviews-store');
      // Use getAll method to return array of objects in store
      let reviewsAll = await store.getAll();
      let reviews = reviewsAll.filter(r => r.restaurant_id == id);
      // If find reviews, return them
      if (reviews.length !== 0) { return reviews; }
    }
    catch(error) {
      console.error("Error while fetching reviews from DB: ", error);
    }
  }

  /**********    Add served reviews to DB    **********/
  static async updateReviewsDB(reviews) {
    try {
      // Create transaction to put reviews into db
      const db = await dbPromise;
      const tx = db.transaction('reviews-store', 'readwrite');
      const store = tx.objectStore('reviews-store');
      for (let i = 0; i < reviews.length; i++) {
        store.put(reviews[i]);
      }
      return tx.complete;
    }
    catch(error) {
      console.error("Error while adding reviews to DB:", error);
    }
  }

  /**********    Add review to server    **********/
  static async addReview(review) {
    try {
      const status = await fetch(DBHelper.REVIEWS_URL, {
        method: 'POST',
        body: JSON.stringify(review)
      });
      if (!status.ok) {
        console.log("Review not added.  Sending review to offline store");
        DBHelper.storeReview(review);
      }
    }
    catch(error) {
      console.error("Error while adding review", error);
    }
  }

  /**********    If offline, save review in offline store    **********/
  static async storeReview(review) {
    try {
      const db = await dbPromise;
      const tx = db.transaction('offline-store', 'readwrite');
      const store = tx.objectStore('offline-store');
      store.put(review);
      return tx.complete;
    }
    catch(error) {
      console.error("Error while storing Review: ", error);
    }
  }

  /**********    Fetch offline reviews and post to server    **********/
  static async fetchOfflineStore() {
    try {
      // Get reviews from offline store
      const db = await dbPromise;
      const tx = db.transaction('offline-store', 'readwrite');
      const store = tx.objectStore('offline-store');
      let reviews = await store.getAll();

      if (reviews.length == 0) { return; }

      // Save reviews to server
      for (let i = 0; i < reviews.length; i++) {
        const review = reviews[i];
        await fetch(DBHelper.REVIEWS_URL, {
          method: 'POST',
          body: JSON.stringify(review)
        }).then(response => {
          if (response.ok) {
            // If successfully added to server, delete review from offline store
            DBHelper.deleteReview(review.id, review.num);
            return;
          }
          console.error("Didn't post review to server");
        });
      }
    }
    catch(error) {
      console.error("Error while fetching from offline store", error);
    }
  }

  /**********    Delete reviews from DB    **********/
  static async deleteReview(id, num) {
    const db = await dbPromise;
    if (id) {
      const tx = db.transaction('reviews-store', 'readwrite');
      const store = tx.objectStore('reviews-store');
      store.delete(id);
      return tx.complete;
    }
    if (num) {
      const tx = db.transaction('offline-store', 'readwrite');
      const store = tx.objectStore('offline-store');
      store.delete(num);
      return tx.complete;
    }
  }
}
