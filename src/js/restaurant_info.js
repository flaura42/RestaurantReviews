/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

/**********    Initialize page upon page load    **********/
document.addEventListener('DOMContentLoaded', () => { initPage(); });

// TODO: Get map overlay to display nicely on small screens (or only display overlay)
/**********    Check online status, send image or initMap()    **********/
async function initPage() {
  try {
    setFavoriteIcon();
    setReviewIcon();
    let container = document.getElementById('restaurant-container');
    // Check online status and send image or initMap()
    let status = await DBHelper.checkLocal();
    if (!status) {
      console.log("Bypassing map");
      const restaurant = await fetchRestaurantFromURL(); // Needed for fBc
      container.setAttribute('aria-label', `Restaurant Details: ${restaurant.name}`);
      fillBreadcrumb();
      const map = document.getElementById('map');
      const div = document.createElement('div');
      const image = document.createElement('img');
      const overlay = document.createElement('img');
      div.id = 'info-map';
      image.src = 'img/map_full.jpg';
      image.className = 'map-img';
      image.alt = 'Displaying offline map';
      map.append(image);
      overlay.src = `img/map_${restaurant.id}.jpg`;
      overlay.className = 'map-overlay';
      overlay.alt = 'Map overlay';
      div.append(overlay);
      map.append(div);
      return map;
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
      self.reviews = reviews;
      // console.log("Reviews being sent: ", reviews.length);
      fillReviewsHTML();

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
  name.className = 'reviewer-name large';
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
  li.setAttribute('aria-current', 'page');
  li.className = 'huge';
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
    const version = (status) ? 'img/icons.svg#favorite-remove' : 'img/icons.svg#favorite-add';
    const button = document.getElementById('favorite-button');
    const check = (button.childNodes.length == 0);

    // Set button icon handlers
    button.onmouseover = () => DBHelper.handleHover('favorite', true);
    button.onmouseout = () => DBHelper.handleHover('favorite', false);
    button.onfocus = () => DBHelper.handleHover('favorite', true);
    button.onfocusout = () => DBHelper.handleHover('favorite', false);
    button.onclick = () => handleClickFavorite();

    // Make button more aria-friendly
    button.setAttribute('aria-label', 'Add  to favorites');
    button.setAttribute('role', 'button');
    button.setAttribute('aria-checked', status);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'favorite-svg';
    svg.setAttribute('class', 'icon-svg');
    svg.setAttribute('viewBox', '0 0 45 35');
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // To improve a11y
    svg.innerHTML = '<title>Add to favorites button</title>';

    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.id = 'favorite-icon';
    use.className.baseVal = 'icon';
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', version);
    svg.appendChild(use);

    (check) ? button.appendChild(svg) : button.replaceChild(svg, button.childNodes[0]);

    // Event handler for browsers that don't support DOM 'onfocusout' method
    button.addEventListener('focusout', () => {
      DBHelper.handleHover('favorite', false);
    });
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

// TODO: Add a11y for alert
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

/******************************************************************************/
/*                            Reviews Functions                             */
/******************************************************************************/

/**********    Set review icon    **********/
async function setReviewIcon() {
  try {
    const button = document.getElementById('review-button');
    const check = (button.childNodes.length == 0);

    // Set button handlers
    button.onmouseover = () => DBHelper.handleHover('review', true);
    button.onmouseout = () => DBHelper.handleHover('review', false);
    button.onfocus = () => DBHelper.handleHover('review', true);
    button.onfocusout = () => DBHelper.handleHover('review', false);
    button.onclick = () => handleClickReview();

    // Make button more aria-friendly
    button.setAttribute('aria-label', 'Add  review');
    button.setAttribute('role', 'button');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'review-svg';
    svg.setAttribute('class', 'icon-svg');
    svg.setAttribute('viewBox', '0 0 45 35');
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // To improve a11y
    svg.innerHTML = '<title>Add review button</title>';

    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.id = 'review-icon';
    use.className.baseVal = 'icon';
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'img/icons.svg#review');

    svg.appendChild(use);

    (check) ? button.appendChild(svg) : button.replaceChild(svg, button.childNodes[0]);

    // Event handler for browsers that don't support DOM 'onfocusout' method
    button.addEventListener('focusout', () => {
      DBHelper.handleHover('review', false);
    });
  }
  catch(error) {
    console.error("Error while setting review icon: ", error);
  }
}

/**********    Handle click on Reviews button    **********/
async function handleClickReview() {
  try {
    const id = getParameterByName('id');
    const restaurant = await DBHelper.fetchRestaurantById(id);
    createForm(restaurant);
    // To prevent opening of multiple forms
    const button = document.getElementById('review-button');
    button.removeChild(button.childNodes[0]);
  }
  catch(error) {
    console.error("Error while handling review click: ", error);
  }
}

// TODO: Add delete review functionality
/**********    Create the form when needed using JavaScript!    **********/
function createForm(restaurant) {
  const container = document.getElementById('reviews-container');
  const list = document.getElementById('reviews-list');
  const form = document.createElement('form');
  form.id = 'form';
  form.role = 'form';
  form.setAttribute('aria-label', `Review ${restaurant.name}`);

  // Title section
  const header = document.createElement('div');
  header.id = 'form-header';
  header.className = 'header';
  const title = document.createElement('h3');
  title.className = 'huge';
  title.innerHTML = `Review ${restaurant.name}`;
  header.append(title);

  // Close icon
  const close = document.createElement('button');
  close.id = 'close-button';
  close.className = 'icon-button';
  close.onmouseover = () => DBHelper.handleHover('close', true);
  close.onmouseout = () => DBHelper.handleHover('close', false);
  close.onfocus = () => DBHelper.handleHover('close', true);
  close.onfocusout = () => DBHelper.handleHover('close', false);
  close.onclick = () => clearForm();

  // Make button more aria-friendly
  close.setAttribute('aria-label', 'Close form');
  close.setAttribute('role', 'button');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'close-svg';
  svg.setAttribute('class', 'icon-svg');
  svg.setAttribute('viewBox', '0 0 45 45');
  svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  // To improve a11y
  svg.innerHTML = '<title>Close form button</title>';

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.id = 'close-icon';
  use.className.baseVal = 'icon';
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'img/icons.svg#close');
  svg.appendChild(use);

  close.append(svg);
  header.append(close);

  form.append(header);

  // Contents section
  const contents = document.createElement('div');
  contents.id = 'form-contents';

  // Name/Rating section
  const top = document.createElement('div');
  top.id = 'contents-top';

  // Name field
  const name = document.createElement('div');
  name.id = 'name-div';
  const label = document.createElement('label');
  const input = document.createElement('input');
  label.setAttribute('for', 'name');
  label.setAttribute('class', 'form-label medium');
  label.innerHTML = 'Name:<span style="color: red;">*</span>';
  name.append(label);

  input.type = 'text';
  input.id = 'name';
  input.className = 'form-box medium';
  input.name = 'name';
  input.autofocus = true;
  input.setAttribute('minlength', '2'); // doesn't work
  input.setAttribute('maxlength', '15');
  input.required = true;
  input.setAttribute('aria-required', true);
  name.append(input);
  top.append(name);

  // Rating Select box
  const select = document.createElement('div');
  select.id = 'selects';
  const selectLabel = document.createElement('label');
  selectLabel.setAttribute('for', 'rating');
  selectLabel.setAttribute('class', 'form-label medium');
  selectLabel.innerHTML = 'Rating:';
  select.append(selectLabel);

  const selectSection = document.createElement('select');
  selectSection.id = 'rating';
  selectSection.className = 'form-box medium';

  for (let i = 1; i < 6; i++) {
    let option = document.createElement('option');
    option.name = 'rating';
    option.value = i;
    option.innerHTML = i;
    if (i == 5) {
      option.selected = true;
    }
    selectSection.append(option);
  }
  select.append(selectSection);
  top.append(select);
  contents.append(top);

  // Comments field
  const comments = document.createElement('div');
  const label1 = document.createElement('label');
  label1.setAttribute('for', 'comments');
  label1.className = 'form-label medium';
  label1.innerHTML = 'Comments:<span style="color: red;">*</span>';
  comments.append(label1);

  const text = document.createElement('textarea');
  text.id = 'comments';
  text.className = 'form-box medium';
  text.name = 'comments';
  text.setAttribute('maxlength', '800');
  text.cols = '10';
  text.rows = '10';
  text.required = true;
  text.setAttribute('aria-required', true);
  comments.append(text);
  contents.append(comments);

  // Submit button
  const footer = document.createElement('div');
  footer.id = 'submit-section';


  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.id = 'submit-button';
  submit.className = 'button medium';
  submit.innerHTML = 'Submit Review';
  submit.onclick = () => saveReview(restaurant.id);
  footer.append(submit);

  const subtitle = document.createElement('p');
  subtitle.className = 'small';
  subtitle.innerHTML = '<span style="color: red;">*</span>Fields are required';
  footer.append(subtitle);

  contents.append(footer);
  form.append(contents);

  // Have form appear above reviews list
  container.insertBefore(form, list);

  // Event handler for browsers that don't support DOM 'onfocusout' method
  close.addEventListener('focusout', () => {
    DBHelper.handleHover('close', false);
  });
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
  const rating = document.getElementById('rating').value;
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

function testStatus() {
  getFavoriteStatus();
}

// Tester function for sommer
async function testFav() {
  try {
    const id=1
    const restaurant = await DBHelper.fetchRestaurantById(id);
    console.log("fave status before:", restaurant.is_favorite);
    // restaurant.is_favorite = !restaurant.is_favorite;
    // console.log("fave status after:", restaurant.is_favorite);
    const status = !restaurant.is_favorite;
    console.log('And with variable: ', status);
    const urltoPUT = DBHelper.RESTAURANTS_URL + id + `/?is_favorite=` + status;
    console.log("URL: ", urltoPUT);
  }
  catch(error) {
    console.error("Error during test:", error);
  }
}
