/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

/**********    Initialize page upon page load    **********/
document.addEventListener('DOMContentLoaded', () => { initPage(); });

/**********    Check online status, send image or initMap()    **********/
async function initPage() {
  try {
    setFavoriteIcon();
    setReviewIcon();
    // Check online status and send image or initMap()
    let status = await DBHelper.checkLocal();
    if (!status) {
      console.log("Bypassing map");
      const restaurant = await fetchRestaurantFromURL(); // Needed for fBc
      fillBreadcrumb();
      const div = document.getElementById('map');
      const image = document.createElement('img');
      const overlay = document.createElement('img');
      image.src = 'img/map_full.jpg';
      image.className = 'map-img';
      image.alt = 'No map is available.';
      div.append(image);
      // overlay.src = `img/map_${restaurant.id}.jpg`;
      // overlay.className = 'map-overlay';
      // overlay.alt = 'Map overlay';
      // div.append(overlay);
      return div;
    }
    // console.log("Initializing map");
    initMap();
  }
  catch(error) {
    console.error('Error while initializing page: ', error);
  }
}

/**********    Initialize leaflet map    **********/
async function initMap() {
  try {
    const restaurant = await fetchRestaurantFromURL();
    self.newMap = L.map('map', {
      center: [restaurant.latlng.lat, restaurant.latlng.lng],
      zoom: 16,
      scrollWheelZoom: false,
      zoomControl: false
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

      // fill reviews
      const reviews = await DBHelper.serveReviewsById(id);
      // console.log("Reviews being sent: ", reviews.length);
      fillReviewsHTML(reviews);

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
function fillReviewsHTML(reviews = self.reviews) {
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
  div.className = 'review-top header';
  const name = document.createElement('p');
  name.className = 'reviewer-name';
  name.innerHTML = review.name;
  div.appendChild(name);

  // Change date from millisecond version to actual date and display it
  const dateMilli = review.createdAt;
  const dateValue = new Intl.DateTimeFormat('en-US').format(new Date(dateMilli));
  const date = document.createElement('p');
  date.className = 'review-date';
  date.innerHTML = dateValue;
  div.appendChild(date);

  li.appendChild(div);

  const rating = document.createElement('p');
  rating.className = 'rating';
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

/**********    Set favorite icon    **********/
async function setFavoriteIcon() {
  try {
    // Determine if/what icon is being displayed
    const status = await getFavoriteStatus();
    const version = (status) ? 'img/icons.svg#fave-remove' : 'img/icons.svg#fave-add';
    const favorite = document.getElementById('favorite-div');
    const check = (favorite.childNodes.length == 0);

    // Set favorite icon handlers
    favorite.onmouseover = () => handleHoverFavorite(true);
    favorite.onmouseout = () => handleHoverFavorite(false);
    favorite.onclick = () => handleClickFavorite();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'favorite-svg';
    svg.setAttribute('viewBox', '0 -6 40 40');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    // svg.setAttribute('preserveAspectRatio', 'xMaxYMax meet');

    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.id = 'favorite-icon';
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', version);
    svg.appendChild(use);

    (check) ? favorite.appendChild(svg) : favorite.replaceChild(svg, favorite.childNodes[0]);
  }
  catch(error) {
    console.error("Error while setting favorite icon: ", error);
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

    return restaurant.is_favorite;
  }
  catch(error) {
    console.error("Error while getting favorite status: ", error);
  }
}

/**********    Handle click event for favorite icon    **********/
async function handleClickFavorite() {  // Called from favorite icon
  try {
    const status = await getFavoriteStatus();
    const id = getParameterByName('id');
    switch (status) {
    case false:
      if (confirm('Add this restaurant to favorites?')) {
        await DBHelper.toggleFavorite(id);
        setFavoriteIcon();

      } else {
        // console.log("favorite cancelled");
      }
      break;
    case true:
      if (confirm('Remove favorite?')) {
        await DBHelper.toggleFavorite(id);
        setFavoriteIcon();
      } else {
        // console.log("favorite cancelled");
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

// TODO: Add handling for focus
/**********    Handle icon change when mouseover    **********/
async function handleHoverFavorite(hover) {  // Called from favorite icon
  try {
    const status = await getFavoriteStatus();
    const currentVersion = (status) ? 'img/icons.svg#fave-remove' : 'img/icons.svg#fave-add';
    const hoverVersion = (hover) ? '-hover' : '';
    const version = `${currentVersion}${hoverVersion}`;
    const icon = document.getElementById('favorite-icon');
    icon.href.baseVal = version;
  }
  catch(error) {
    console.error("Error while handling favorite hover", error);
  }
}

/******************************************************************************/
/*                            Reviews Functions                             */
/******************************************************************************/

/**********    Set review icon    **********/
async function setReviewIcon() {
  try {
    // Determine if icon is being displayed
    const review = document.getElementById('review-div');
    const check = (review.childNodes.length == 0);

    // Set review icon handlers
    review.onmouseover = () => handleHover('review', true);
    review.onmouseout = () => handleHover('review', false);
    review.onclick = () => handleClickReview();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'review-svg';
    svg.setAttribute('viewBox', '0 -5 40 40');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.id = 'review-icon';
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'img/icons.svg#review-add');
    svg.appendChild(use);

    (check) ? review.appendChild(svg) : review.replaceChild(svg, review.childNodes[0]);
  }
  catch(error) {
    console.error("Error while setting review icon: ", error);
  }
}

/**********    Handle click on Reviews button    **********/
async function handleClickReview() {  // Called from review icon
  try {
    const id = getParameterByName('id');
    const restaurant = await DBHelper.fetchRestaurantById(id);
    // console.log("Review restaurant: ", restaurant.name);

    createForm(restaurant);
    // To prevent opening of multiple forms
    const div = document.getElementById('review-div');
    div.removeChild(div.childNodes[0]);

    // const container = document.getElementById('reviews-container');
    // const form = document.getElementById('form');
    // if (container.contains(form)) { return; }
    // createForm(restaurant);
  }
  catch(error) {
    console.error("Error while handling review click: ", error);
  }
}

// TODO: Add handling for focus
/**********    Handle icon change when mouseover    **********/
async function handleHover(iconVersion, hoverVersion) {
  try {
    const icon = (iconVersion == 'review') ? document.getElementById('review-icon') : document.getElementById('close-icon');
    const version = (iconVersion == 'review') ? 'review-add' : 'close';
    const hover = (hoverVersion) ? '-hover' : '';
    const newVal = `img/icons.svg#${version}${hover}`;
    icon.href.baseVal = newVal;
  }
  catch(error) {
    console.error("Error while handling review hover", error);
  }
}

// TODO: Add delete review functionality
/**********    Create the form when needed using JavaScript!    **********/
function createForm(restaurant) {
  const container = document.getElementById('reviews-container');
  const list = document.getElementById('reviews-list');
  const form = document.createElement('form');
  form.id = 'form';

  // Title section
  const header = document.createElement('div');
  header.id = 'form-header';
  header.className = 'header';
  const title = document.createElement('h3');
  title.innerHTML = `Review ${restaurant.name}`;
  header.append(title);

  // Close icon
  const close = document.createElement('div');
  close.id = 'close-div';
  close.className = 'icon-div';
  close.onmouseover = () => handleHover('close', true);
  close.onmouseout = () => handleHover('close', false);
  close.onclick = () => clearForm();

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'close-svg';
  svg.setAttribute('viewBox', '-15 -10 35 35');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.id = 'close-icon';
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'img/icons.svg#close');
  svg.appendChild(use);

  close.append(svg);
  header.append(close);

  form.append(header);

  const contents = document.createElement('div');
  contents.id = 'form-contents';

  // Name field
  const name = document.createElement('div');
  const label = document.createElement('label');
  const input = document.createElement('input');
  label.setAttribute('for', 'name');
  label.setAttribute('class', 'form-label');
  label.innerHTML = 'Name: ';
  name.append(label);

  input.type = 'text';
  input.id = 'name';
  input.name = 'name';
  input.autofocus = true;
  input.minlength = '2';
  input.maxlength = '30';
  input.required = true;
  name.append(input);

  contents.append(name);

  // Rating radio buttons
  let radio = document.createElement('div');
  radio.id = 'radio-buttons';
  let legend = document.createElement('legend');
  legend.innerHTML = 'Rating:';
  radio.append(legend);

  for (let i = 1; i < 6; i++) {
    let name = `rating-${i}`;
    let label = document.createElement('label');
    label.setAttribute('for', name);
    label.className = 'radio-label';
    label.innerHTML = i;
    radio.append(label);

    let input = document.createElement('input');
    input.type = 'radio';
    input.id = name;
    input.className = 'radio-button';
    input.name = 'rating';
    input.value = i;
    input.required = true;
    radio.append(input);
  }
  contents.append(radio);

  // Comments field
  const comments = document.createElement('div');
  const label1 = document.createElement('label');
  label1.setAttribute('for', 'comments');
  label1.className = 'form-label';
  label1.innerHTML = 'Comments:';
  comments.append(label1);

  const text = document.createElement('textarea');
  text.id = 'comments';
  text.name = 'comments';
  text.maxlength = '200';
  text.cols = '10';
  text.rows = '10';
  input.required = true;
  comments.append(text);
  contents.append(comments);

  // Submit button
  const footer = document.createElement('div');
  footer.id = 'submit-section';

  const submit = document.createElement('div');
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.id = 'submit';
  submitButton.innerHTML = 'Submit Review';
  submitButton.onclick = () => saveReview(restaurant.id);
  submit.append(submitButton);
  footer.append(submit);

  const subtitle = document.createElement('p');
  subtitle.innerHTML = '*All fields are required';
  footer.append(subtitle);

  contents.append(footer);
  form.append(contents);

// TODO: Decide if have review box fixed position
  // Have form appear above reviews list
  container.insertBefore(form, list);
}


/**********    Remove the form when reviewer finished/clicks X   **********/
function clearForm() {
  // Make review icon reappear
  setReviewIcon();
  // Make form disappear
  const form = document.getElementById('form');
  form.remove();
}

/**********    Function for storing form data   **********/
function reviewData(id) {
  const name = document.getElementById('name').value;
  const rating = document.querySelector('input[name="rating"]:checked').value;
  const comments = document.getElementById('comments').value;
  const review = {
    'restaurant_id': id,
    'name': name,
    'rating': rating,
    'comments': comments,
    'createdAt': Date.now(),
    'updatedAt': Date.now()
  };
  event.preventDefault();
  return review;
}

// TODO: Have user notified if review can't be saved.  Try again?/Save for later?/Cancel?  Ping url after click and then ask?
/**********    Save review to the server    **********/
async function saveReview(id) {
  try {
    // Make review icon reappear
    setReviewIcon();
    // console.log("running saveReview()");
    const review = reviewData(id);
    const ping = await DBHelper.pingUrl(DBHelper.REVIEWS_URL);
    if (ping == true) { DBHelper.addReview(review); }
    else { DBHelper.storeReview(review); }
    // DBHelper.storeReview(review);
  }
  catch(error) {
    console.error("Error while saving review: ", error);
  }
}

/******************************************************************************/
/*                            Test Functions                             */
/******************************************************************************/

async function testPing() {
  try {
    const url = DBHelper.REVIEWS_URL;
    // const url = DBHelper.LOCAL_URL;
    const status = await DBHelper.pingUrl(url);
    // console.log("Results are: ", status);
  }
  catch(error) {
    console.error("Error while testing ping: ", error);
  }
}

function testOffline() {
  // console.log("running test offline");
  let x = 1;
  for (let i = x; i < (x+2); i++) {
    const review = {
      'restaurant_id': 1,
      'name': 'Offline Test',
      'rating': i,
      'comments': `Offline ${i}`,
      'createdAt': Date.now(),
      'updatedAt': Date.now()
    };
    DBHelper.storeReview(review);
  }

  // console.log("Test ran");
}

function testStore() {
  // console.log("Running test store");
  DBHelper.fetchOfflineStore();
}
