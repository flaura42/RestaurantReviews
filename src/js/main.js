/******************************************************************************/
/*                               Event Listeners                              */
/******************************************************************************/

/**********    Fetch restaurants as soon as the page is loaded    **********/
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  updateRestaurants();
  fetchNeighborhoods();
  fetchCuisines();
});

/**********    Listen for change on favorites checkbox    **********/
document.getElementById('faves-checkbox').addEventListener('change', () => {
  handleChangeFavorites();
});

/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

// TODO: figure out what is wrong with Kang Ho Dong Baekjeong favoriting

// Toggle map for easier testing with internet issues
const nomap = true;

/**********    Update page and map for current restaurants    **********/
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
function resetRestaurants(restaurants) {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';
  self.restaurants = restaurants;

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  if (navigator.onLine) {
    self.markers = [];
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

/**********    Initialize leaflet map, called from HTML    **********/
function initMap() {

  // Checks if online and send image map if not.
  if (!navigator.onLine || (nomap == true))  {
    const div = document.getElementById('map');
    const image = document.createElement('img');
    image.src = 'img/nomap.jpg';
    image.className = 'map-img';
    image.alt = 'No map is available.';
    div.append(image);
    return div;
  }
  // If online, produces map.
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 11,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiZmxhdXJhNDIiLCJhIjoiY2ppZjg5a2s4MHU1bjNrcWxwdW1zbzFiYyJ9.ZqYGMaSHFxiPjqBxxLYhyA',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);
}

/**********    Add all restaurants HTML to the webpage    **********/
function fillRestaurantsHTML(restaurants = self.restaurants) {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  // Only add markers if currently online.
  if (navigator.onLine) {
    addMarkersToMap();
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
function addMarkersToMap(restaurants = self.restaurants) {
  // Only add markers if currently online.
  if (!navigator.onLine || (nomap == true)) { return; }
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

/******************************************************************************/
/*                            Favorites Functions                             */
/******************************************************************************/

/**********    Handle Favorites checkbox event     **********/
async function handleChangeFavorites() {
  try {
    let checkbox = document.getElementById('faves-checkbox');
    let checkFavorites = await DBHelper.checkFavorites();
    if (checkbox.checked && checkFavorites.length == 0) {
      // console.log("Checkbox checked and empty: ", checkbox.checked, checkFavorites.length);
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
