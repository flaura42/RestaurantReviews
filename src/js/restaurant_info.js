/******************************************************************************/
/*                               Event Listeners                              */
/******************************************************************************/

/**********    Initialize map as soon as the page is loaded    **********/
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setFavoriteIcon();
});

/**********    Listen for clicks on favorite icon    **********/
document.getElementById('favorite-icon').addEventListener('click', () => {
  handleClickFavorite();
});

/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

// Toggle map for easier testing with internet issues
const nomap = true;

/**********    Initialize leaflet map    **********/
async function initMap() {
  try {
    const restaurant = await fetchRestaurantFromURL();

    // Checks if online and send image map if not.
    if (!navigator.onLine || (nomap == true)) {
      fillBreadcrumb();
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
      center: [restaurant.latlng.lat, restaurant.latlng.lng],
      zoom: 16,
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
    fillBreadcrumb();
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
  }
  catch(error) {
    console.error("Error while running initMap:", error);
  }
}

/**********    Get current restaurant from page URL    **********/
async function fetchRestaurantFromURL() {
  try {
    if (self.restaurant) {
      return self.restaurant;
    }
    const id = getParameterByName('id');
    if (!id) {
      console.error("No restaurant ID in URL");
    } else {
      const restaurant = await DBHelper.fetchRestaurantById(id);
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error("Restaurant not found");
        return;
      }
      fillRestaurantHTML();
      return restaurant;
    }
  }
  catch(error) {
    console.error("Error while fetching restaurant from URL:", error);
  }
}

/**********    Create restaurant HTML and add it to the webpage    **********/
function fillRestaurantHTML(restaurant = self.restaurant) {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img lazyload';
  image.alt = `View of ${restaurant.name}`;
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);

  // Added for lazy loading
  image.setAttribute('data-sizes', 'auto');
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  image.setAttribute('data-srcset', DBHelper.imageSrcsetForRestaurant(restaurant));

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**********    Create and add operating hours HTML table    **********/
function fillRestaurantHoursHTML(operatingHours = self.restaurant.operating_hours) {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**********    Create and add all reviews HTML    **********/
function fillReviewsHTML(reviews = self.restaurant.reviews) {
  const container = document.getElementById('reviews-container');
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = `Be the first to review ${restaurant.name}!`;
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**********    Create and add review HTML    **********/
function createReviewHTML(review) {
  const li = document.createElement('li');

  const div = document.createElement('div');
  div.className = 'review-top';
  const name = document.createElement('p');
  name.innerHTML = review.name;
  div.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  div.appendChild(date);

  li.appendChild(div);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**********    Add restaurant name to breadcrumb nav   **********/
function fillBreadcrumb(restaurant = self.restaurant) {
  const breadcrumb = document.getElementById('breadcrumb-list');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**********    Get a parameter by name from page URL    **********/
function getParameterByName(name, url) {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/******************************************************************************/
/*                            Favorites Functions                             */
/******************************************************************************/

/**********    Handle click event for favorite icon    **********/
async function handleClickFavorite() {
  try {
    console.log("favorite icon clicked");
    const status = await getFavoriteStatus();
    const id = getParameterByName('id');
    switch (status) {
    case false:
      if (confirm('Add this restaurant to favorites?')) {
        await DBHelper.toggleFavorite(id);
        setFavoriteIcon();

      } else {
        console.log("favorite cancelled");
      }
      break;
    case true:
      if (confirm('Remove favorite?')) {
        await DBHelper.toggleFavorite(id);
        setFavoriteIcon();
      } else {
        console.log("favorite cancelled");
      }
      break;
    default:
      alert('Sorry, error saving favorite.  Please try again.');
    }
  }
  catch(error) {
    console.error("Error while handling the favorite click: ", error);
  }
}

/**********    Get the current favorite status    **********/
async function getFavoriteStatus() {
  try {
    const id = getParameterByName('id');
    const restaurant = await DBHelper.fetchRestaurantById(id);
  
    // Fix for restaurants without an is_favorite key
    if (restaurant.is_favorite == undefined) {
      Object.defineProperty(restaurant, 'is_favorite', { value: false });
    }

    const status = restaurant.is_favorite;
    console.log("Status is: ", status);
    return status;
  }
  catch(error) {
    console.error("Error while getting favorite status: ", error);
  }
}

/**********    Set favorite icon    **********/
async function setFavoriteIcon() {
  try {
    const status = await getFavoriteStatus();
    const favorite = document.getElementById('favorite-icon');
    const check = (favorite.childNodes.length == 0);
    const img = document.createElement('img');
    img.id = 'favorite-img';
    img.alt = 'Favorite this restaurant';
    console.log("setting icon to: ", status);
    img.src = (status == true) ? '/img/bookmark-check.png' : '/img/bookmark-plus.png';
    (check == true) ? favorite.appendChild(img) : favorite.replaceChild(img, favorite.childNodes[0]);
  }
  catch(error) {
    console.error("Error while setting favorite icon: ", error);
  }
}
