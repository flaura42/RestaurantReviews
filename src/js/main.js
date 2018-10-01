/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

/**********    Initialize page upon page load    **********/
document.addEventListener('DOMContentLoaded', () => { initPage(); });

/**********    Handle page load    **********/
async function initPage() {
  try {
    setFavoritesIcon(false);
    updateRestaurants();
    fetchNeighborhoods();
    fetchCuisines();
    // Check online status and send image or initMap()
    let status = await DBHelper.checkLocal();
    if (!status) {
      const div = document.getElementById('map');
      const image = document.createElement('img');
      image.src = 'img/map_full.jpg';
      image.className = 'map-img';
      image.alt = 'Offline map';
      div.append(image);
      return div;
    }
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

    let status = document.getElementById('show-favorites-icon').href.baseVal;
    let restaurants;
    switch (status) {
    case 'img/icons.svg#show-favorites-true':
      restaurants = await DBHelper.fetchFavorites(neighborhood, cuisine);
      if (restaurants == 0) {
        resetRestaurants(restaurants);
        const ul = document.getElementById('restaurants-list');
        const p = document.createElement('p');
        p.className = 'medium';
        p.innerHTML = 'Sorry, there are no results with those filter settings.';
        ul.appendChild(p);
        return;
      }
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      break;
    case 'img/icons.svg#show-favorites-false':
      restaurants = await DBHelper.fetchRestaurantsByFilter(neighborhood, cuisine);
      if (restaurants == 0) {
        resetRestaurants(restaurants);
        const ul = document.getElementById('restaurants-list');
        const p = document.createElement('p');
        p.className = 'medium';
        p.innerHTML = 'Sorry, there are no results with those filter settings.';
        ul.appendChild(p);
        return;
      }
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      break;
    default:
      console.error("Swich error for updateRestaurants()");
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
      option.value = neighborhood;
      option.innerHTML = neighborhood;
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
      option.value = cuisine;
      option.innerHTML = cuisine;
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
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
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

  // Added for lazy loading
  image.setAttribute('data-sizes', 'auto');
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  image.setAttribute('data-srcset', DBHelper.imageSrcsetForRestaurant(restaurant));
  // Add image
  li.append(image);

  const div = document.createElement('div');
  div.className = 'restaurant-info';

  const name = document.createElement('h2');
  name.className = 'huge';
  name.innerHTML = restaurant.name;
  div.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.className = 'large';
  neighborhood.innerHTML = restaurant.neighborhood;
  div.append(neighborhood);

  const address = document.createElement('p');
  address.className = 'large';
  address.innerHTML = restaurant.address;
  div.append(address);

  li.append(div);

  const more = document.createElement('a');
  more.className = 'button small';
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `View Details for ${restaurant.name}`);
  more.setAttribute('role', 'button');
  more.setAttribute('onkeypress', 'checkKey(event)');
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

/**********    Allow <a> buttons to use spacebar for A11y    **********/
function checkKey(event) {
  if (event.keyCode == 32) {
    window.location.href = event.target.href;
  }
}

/******************************************************************************/
/*                            Favorites Functions                             */
/******************************************************************************/

/**********    Set favorites icon    **********/
function setFavoritesIcon(value) {
  const button = document.getElementById('show-favorites-button');
  const check = (button.childNodes.length == 0);

  // Set button icon handlers
  button.onmouseover = () => DBHelper.handleHover('show-favorites', true);
  button.onmouseout = () => DBHelper.handleHover('show-favorites', false);
  button.onfocus = () => DBHelper.handleHover('show-favorites', true);
  button.onfocusout = () => DBHelper.handleHover('show-favorites', false);
  button.onclick = () => handleClickFavorites();

  // Make button more aria-friendly
  button.setAttribute('aria-label', 'View favorites only');
  button.setAttribute('role', 'button');
  button.setAttribute('aria-checked', value);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'show-favorites-svg';
  svg.setAttribute('class', 'icon-svg');
  svg.setAttribute('viewBox', '0 0 45 35');
  svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  // To improve a11y
  svg.innerHTML = '<title>Filter favorites button</title>';

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.id = 'show-favorites-icon';
  use.className.baseVal = 'icon';
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `img/icons.svg#show-favorites-${value}`);
  svg.appendChild(use);

  (check) ? button.appendChild(svg) : button.replaceChild(svg, button.childNodes[0]);

  // Event handler for browsers that don't support DOM 'onfocusout' method
  document.getElementById('show-favorites-button').addEventListener('focusout', () => {
    DBHelper.handleHover('show-favorites', false);
  });
}

/**********    Handle click event for favorites icon    **********/
async function handleClickFavorites() {
  try {
    let status = document.getElementById('show-favorites-icon').href.baseVal;
    let checkFavorites = await DBHelper.checkFavorites();

    switch (status) {
    case 'img/icons.svg#show-favorites-false':
      if (checkFavorites.length == 0) {
        alert('No restaurants have been favorited.  Please click the favorite icon for a restaurant to do so.');
      } else {
        setFavoritesIcon(true);
      }
      break;
    case 'img/icons.svg#show-favorites-true':
      setFavoritesIcon(false);
      break;
    default:
      setFavoritesIcon(false);
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
