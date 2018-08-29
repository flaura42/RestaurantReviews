/******************************************************************************/
/*                               Event Listeners                              */
/******************************************************************************/

/**********    Initialize map as soon as the page is loaded    **********/
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  checkForFavorite();
});

/**********    Listen for clicks on favorite icon    **********/
document.getElementById('favorite').addEventListener('click', () => {
  handleClick();
});

/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

/**********    Initialize leaflet map    **********/
let initMap = () => {
  fetchRestaurantFromURL(restaurant => {
    let nomap = false;
    if (nomap == true) {
      fillBreadcrumb();
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
      fillBreadcrumb();
      const div = document.getElementById('map');
      const image = document.createElement('img');
      image.src = 'img/nomap.jpg';
      image.className = 'map-img';
      image.alt = 'No map is available.';
      div.append(image);
      return div;
    // If online, produces map.
    } else {
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
  });
};

/**********    Get current restaurant from page URL    **********/
let fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(self.restaurant);
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    console.error("No restaurant ID in URL");
  } else {
    DBHelper.fetchRestaurantById(id, restaurant => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error("Restaurant not found");
        return;
      }
      fillRestaurantHTML();
      callback(restaurant);
    });
  }
};

/**********    Create restaurant HTML and add it to the webpage    **********/
let fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const image = document.getElementById('restaurant-img');
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
};

/**********    Create and add operating hours HTML table    **********/
let fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
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
};

/**********    Create and add all reviews HTML    **********/
let fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**********    Create and add review HTML    **********/
let createReviewHTML = (review) => {
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
};

/**********    Add restaurant name to breadcrumb nav   **********/
let fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb-list');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**********    Get a parameter by name from page URL    **********/
let getParameterByName = (name, url) => {
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
};

/******************************************************************************/
/*                            Favorites Functions                             */
/******************************************************************************/

/**********    Handle click event for favorite icon    **********/
// TODO: Find better way of doing this
let handleClick = () => {
  console.log("favorite icon clicked");
  const id = getParameterByName('id');
  DBHelper.checkForFavorite(id, status => {
    console.log("favorite version: ", status);
    switch (status) {
    case '/img/bookmark-plus.png':
      if (confirm('Add this restaurant to favorites?')) {
        let imgVersion = 'check';
        DBHelper.toggleFavorite(id);
        DBHelper.setFavorite(imgVersion);
      } else {
        console.log("favorite cancelled");
      }
      break;
    case '/img/bookmark-check.png':
      if (confirm('Remove favorite?')) {
        let imgVersion = 'plus';
        DBHelper.toggleFavorite(id);
        DBHelper.setFavorite(imgVersion);
      } else {
        console.log("favorite cancelled");
      }
      break;
    default:
      alert('Sorry, error saving favorite.  Please try again.');
    }
  });
};

/**********    Determine which Favorites icon to display    **********/
let checkForFavorite = () => {
  const id = getParameterByName('id');
  DBHelper.checkForFavorite(id, status => {
    console.log("Setting favorite version to ", status);
    const favorite = document.getElementById('favorite');
    const img = document.createElement('img');
    img.id = 'favorite-img';
    img.src = status;
    favorite.appendChild(img);
  });
};
