/******************************************************************************/
/*                               Event Listeners                              */
/******************************************************************************/

/**********    Fetch restaurants as soon as the page is loaded    **********/
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  updateRestaurants();
});

/**********    Listen for change on favorites checkbox    **********/
document.getElementById('faves-checkbox').addEventListener('change', () => {
  handleChange();
});

/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

/**********    Fetch all neighborhoods and set their HTML    **********/
async function fetchNeighborhoods() {
  try {
    const neighborhoods = await DBHelper.fetchNeighborhoods();
    // console.log("fetched neighborhoods: ", neighborhoods);
    self.neighborhoods = neighborhoods;
    fillNeighborhoodsHTML();
  }
  catch(error) {
    console.error("Error while fetching neighborhoods: ", error);
  }
}

/**********    Set neighborhoods HTML    **********/
function fillNeighborhoodsHTML(neighborhoods = self.neighborhoods) {
  const select = document.getElementById('neighborhoods-select');
  select.setAttribute('aria-label', 'filter by neighborhood');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**********    Fetch all cuisines and set their HTML    **********/
async function fetchCuisines() {
  try {
    const cuisines = await DBHelper.fetchCuisines();
    // console.log("fetched cuisines: ", cuisines);
    self.cuisines = cuisines;
    fillCuisinesHTML();
  }
  catch(error) {
    console.error("Error while fetching cuisines: ", error);
  }
}

/**********    Set cuisines HTML    **********/
function fillCuisinesHTML(cuisines = self.cuisines) {
  const select = document.getElementById('cuisines-select');
  select.setAttribute('aria-label', 'filter by cuisine');
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**********    Initialize leaflet map, called from HTML    **********/
function initMap() {
  let nomap = true;
  if (nomap == true) {
    const div = document.getElementById('map');
    const image = document.createElement('img');
    image.src = 'img/nomap.jpg';
    image.className = 'map-img';
    image.alt = 'No map is available.';
    div.append(image);
    return div;
  }
  // Checks if online and send image map if not.
  if (!navigator.onLine) {
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

/**********    Update page and map for current restaurants    **********/
async function updateRestaurants() {
  try {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    const restaurants = await DBHelper.fetchRestaurantsByFilter(cuisine, neighborhood);
    // console.log("restaurants being updated: ", restaurants);
    resetRestaurants(restaurants);
    fetchNeighborhoods();
    fetchCuisines();
    fillRestaurantsHTML();

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
  // console.log("resetR complete");
}


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

/**
 * Create restaurant HTML.
 */
function createRestaurantHTML(restaurant) {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img lazyload';
  image.alt = `View of ${restaurant.name}`;
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);


  // TODO Figure out why image changes size too soon
  // EX: from 255 to 490 when img width is 180 and
  // from 490 to 800 when img width is 319
  // Doesn't appear to be related to window size
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
  if (!navigator.onLine) { return; }
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

function handleChange() {
  let checkbox = document.getElementById('faves-checkbox');
  if (checkbox.checked == true) {
    // console.log("checkbox checked");
    updateFavorites();
  } else {
    // console.log("checkbox not checked");
    updateRestaurants();
  }
}

/**********    Update page and map for favorite restaurants    **********/
async function updateFavorites() {
  try {
    const restaurants = await DBHelper.getFavorites();
    if (restaurants == null) { return; }
    resetRestaurants(restaurants);
    fetchNeighborhoods();
    fetchCuisines();
    fillRestaurantsHTML();
  }
  catch(error) {
    console.error("Error while updating favorites: ", error);
  }
}
