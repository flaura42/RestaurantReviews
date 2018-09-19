/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

/**********    Initialize page upon page load    **********/
document.addEventListener('DOMContentLoaded', () => { initPage(); });

// TODO: Add map info overlay to static map for compliance
/**********    Handle page load    **********/
async function initPage() {
  try {
    updateRestaurants();
    fetchNeighborhoods();
    fetchCuisines();
    // Check online status and send image or initMap()
    let status = await DBHelper.checkLocal();
    if (!status) {
      console.log("Bypassing map");
      const div = document.getElementById('map');
      const image = document.createElement('img');
      image.src = 'img/map_full.jpg';
      image.className = 'map-img';
      image.alt = 'No map is available.';
      div.append(image);
      return div;
    }
    // console.log("Initializing map");
    initMap();
  }
  catch(error) {
    console.error('Error while initializing page: ', error);
  }
}

/**********    Update page for current restaurants    **********/
async function updateRestaurants() {
  try {
    const nSelect = document.getElementById('neighborhoods-select');
    const cSelect = document.getElementById('cuisines-select');

    const nIndex = nSelect.selectedIndex;
    const cIndex = cSelect.selectedIndex;

    const neighborhood = nSelect[nIndex].value;
    const cuisine = cSelect[cIndex].value;

    let checkbox = document.getElementById('faves-checkbox');
    if (checkbox.checked == true) {
      // console.log("Updating favorites:", neighborhood, cuisine);
      const restaurants = await DBHelper.fetchFavorites(neighborhood, cuisine);
      if (restaurants == null) { return; }
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    } else {
      // console.log("Updating restaurants");
      const restaurants = await DBHelper.fetchRestaurantsByFilter(neighborhood, cuisine);

      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  }
  catch(error) {
    console.error("Error while updating restaurants: ", error);
  }
}

/**********    Clear current restaurants, HTML and map markers    **********/
async function resetRestaurants(restaurants) {
  try {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';
    self.restaurants = restaurants;

    // Remove all map markers
    if (self.markers) { self.markers.forEach(marker => marker.remove()); }

    // Check online status and clear markers if online
    let status = await DBHelper.checkLocal();
    if (status) { self.markers = []; }
  }
  catch(error) {
    console.error("Error while resetting restaurants: ", error);
  }

}

/**********    Fetch all neighborhoods and set their HTML    **********/
async function fetchNeighborhoods() {
  try {
    const neighborhoods = await DBHelper.fetchNeighborhoods();
    // console.log("fetched neighborhoods: ", neighborhoods);
    if (neighborhoods == null) { return; }

    self.neighborhoods = neighborhoods;

    const select = document.getElementById('neighborhoods-select');
    select.setAttribute('aria-label', 'filter by neighborhood');
    neighborhoods.forEach(neighborhood => {
      const option = document.createElement('option');
      option.innerHTML = neighborhood;
      option.value = neighborhood;
      select.append(option);
    });
  }
  catch(error) {
    console.error("Error while fetching neighborhoods: ", error);
  }
}

/**********    Fetch all cuisines and set their HTML    **********/
async function fetchCuisines() {
  try {
    const cuisines = await DBHelper.fetchCuisines();
    // console.log("fetched cuisines: ", cuisines);

    if (cuisines == null) { return; }

    self.cuisines = cuisines;

    const select = document.getElementById('cuisines-select');
    select.setAttribute('aria-label', 'filter by cuisine');
    cuisines.forEach(cuisine => {
      const option = document.createElement('option');
      option.innerHTML = cuisine;
      option.value = cuisine;
      select.append(option);
    });
  }
  catch(error) {
    console.error("Error while fetching cuisines: ", error);
  }
}

/**********    Initialize leaflet map    **********/
function initMap() {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 11,
    scrollWheelZoom: false,
    zoomControl: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiZmxhdXJhNDIiLCJhIjoiY2ppZjg5a2s4MHU1bjNrcWxwdW1zbzFiYyJ9.ZqYGMaSHFxiPjqBxxLYhyA',
    maxZoom: 18,
    // attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
    //   '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    //   'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets',
    attributionControl: false,
    prefix: false
  }).addTo(newMap);
}

/**********    Add all restaurants HTML to the webpage    **********/
async function fillRestaurantsHTML(restaurants = self.restaurants) {
  try {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
      ul.append(createRestaurantHTML(restaurant));
    });
    // Only add markers if currently online.
    let status = await DBHelper.checkLocal();
    if (status) { addMarkersToMap(); }
  }
  catch(error) {
    console.error("Error while filling restaurants HTML:", error);
  }

}

/**********    Create all restaurants HTML    **********/
function createRestaurantHTML(restaurant) {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img lazyload';
  image.alt = `View of ${restaurant.name}`;
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);

  // Added for lazy loading
  image.setAttribute('data-sizes', 'auto');
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  image.setAttribute('data-srcset', DBHelper.imageSrcsetForRestaurant(restaurant));
  // Add image
  li.append(image);

  const div = document.createElement('div');
  div.className = 'restaurant-info';

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  div.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  div.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  div.append(address);

  li.append(div);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `View Details for ${restaurant.name}`);
  more.setAttribute('role', 'button');
  li.append(more);

  return li;
}

/**********    Add markers for current restaurants to the map    **********/
async function addMarkersToMap(restaurants = self.restaurants) {
  try {
    // Only add markers if currently online.
    let status = await DBHelper.checkLocal();
    if (!status) { return; }
    restaurants.forEach(restaurant => {
      // Add marker to the map
      const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
      marker.on('click', onClick);
      function onClick() {
        window.location.href = marker.options.url;
      }
      self.markers.push(marker);
    });
  }
  catch(error) {
    console.error("Error while adding markers to map: ", error);
  }

}

/******************************************************************************/
/*                            Favorites Functions                             */
/******************************************************************************/

/**********    Handle Favorites checkbox event     **********/
async function handleChangeFavorites() {  // Called from favorites checkbox
  try {
    let checkbox = document.getElementById('faves-checkbox');
    let checkFavorites = await DBHelper.checkFavorites();
    if (checkbox.checked && checkFavorites.length == 0) {
      alert('No restaurants have been favorited.  Please click the favorite icon for a restaurant to do so.');
      document.getElementById('faves-checkbox').checked = false;
    }
    resetSelects();
    updateRestaurants();
    fetchNeighborhoods();
    fetchCuisines();
  }
  catch(error) {
    console.error("Error while handling favorites:", error);
  }
}

/**********    Reset filter selects to avoid duplicates    **********/
function resetSelects() {
  // Reset cuisine filter selects (needed for favorites to work right)
  const cSelect = document.getElementById('cuisines-select');
  let cMax = cSelect.length;
  for (let i = cMax; i > 0; i--) {
    document.getElementById('cuisines-select').remove(i);
  }
  // Reset neighborhoods filter selects (needed for favorites to work right)
  const nSelect = document.getElementById('neighborhoods-select');
  let nMax = nSelect.length;
  for (let i = nMax; i > 0; i--) {
    document.getElementById('neighborhoods-select').remove(i);
  }
}

/******************************************************************************/
/*                            Test Functions                             */
/******************************************************************************/

// Test checkLocal
async function testLocal() {
  try {
    let test = await DBHelper.checkLocal();
    console.log("test local results: ", test);
    return test;
  }
  catch(error) {
    console.log("Error while testing local", error);
  }
}
