/******************************************************************************/
/*                               Event Listeners                              */
/******************************************************************************/

/**********    Initialize map as soon as the page is loaded    **********/
document.addEventListener('DOMContentLoaded', () => {
  initPage();
  setFavoriteIcon();
});

/**********    Listen for clicks on favorite icon    **********/
document.getElementById('favorite-icon').addEventListener('click', () => {
  handleClickFavorite();
});

/**********    Listen for clicks on review icon    **********/
document.getElementById('review-icon').addEventListener('click', () => {
  handleClickReview();
});

/******************************************************************************/
/*                             Pagewide Functions                             */
/******************************************************************************/

// Toggle map for easier testing with internet issues
const nomap = true;
const pingLocal = DBHelper.pingServer(DBHelper.LOCAL_URL);

/**********    Check online status, send image or initMap()    **********/
async function initPage() {
  try {
    // Checks if online and sends map image if not
    if (!navigator.onLine || !pingLocal || (nomap == true)) {
      console.log("Bypassing map");
      const restaurant = await fetchRestaurantFromURL(); // Needed for fBc
      fillBreadcrumb();
      const div = document.getElementById('map');
      const image = document.createElement('img');
      image.src = 'img/nomap.jpg';
      image.className = 'map-img';
      image.alt = 'No map is available.';
      div.append(image);
      return div;
    }
    console.log("Initializing map");
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

      // fill reviews
      const reviews = await DBHelper.serveReviewsById(id);
      console.log("Reviews being sent: ", reviews.length);
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
  div.className = 'review-top';
  const name = document.createElement('p');
  name.innerHTML = review.name;
  div.appendChild(name);

  // Change date from millisecond version to actual date and display it
  const dateMilli = review.createdAt;
  const dateValue = new Intl.DateTimeFormat('en-US').format(new Date(dateMilli));
  const date = document.createElement('p');
  date.innerHTML = dateValue;
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
    // console.log("favorite icon clicked");
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
    // console.log("Status is: ", status);
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
    // console.log("setting icon to: ", status);
    img.src = (status == true) ? '/img/bookmark-check.png' : '/img/bookmark-plus.png';
    (check == true) ? favorite.appendChild(img) : favorite.replaceChild(img, favorite.childNodes[0]);
  }
  catch(error) {
    console.error("Error while setting favorite icon: ", error);
  }
}

/******************************************************************************/
/*                            Reviews Functions                             */
/******************************************************************************/

/**********    Handle click on Reviews button    **********/
async function handleClickReview() {
  try {
    const id = getParameterByName('id');
    const restaurant = await DBHelper.fetchRestaurantById(id);
    console.log("Review restaurant: ", restaurant.name);

    // To prevent opening of multiple forms
    const container = document.getElementById('reviews-container');
    const form = document.getElementById('form');
    if (container.contains(form)) { return; }

    createForm(restaurant);
    handleClickForm(restaurant);
  }
  catch(error) {
    console.error("Error while handling review click: ", error);
  }
}

/**********    Create the form when needed using JavaScript!    **********/
function createForm(restaurant) {
  const container = document.getElementById('reviews-container');
  const header = document.getElementById('reviews-header');
  const form = document.createElement('form');
  form.id = 'form';

  // Title section
  const titleSection = document.createElement('div');
  titleSection.id = 'title';
  const title = document.createElement('h3');
  title.innerHTML = `Review ${restaurant.name}`;
  titleSection.append(title);

  const close = document.createElement('p');
  close.id = 'close';
  close.innerHTML = '&times;';
  titleSection.append(close);

  // TODO: Decide if keep here or move to right of submit button
  const subtitle = document.createElement('p');
  subtitle.innerHTML = '(All fields are required)';
  titleSection.append(subtitle);
  form.append(titleSection);

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

  form.append(name);

  // Rating radio buttons
  let radio = document.createElement('div');
  let legend = document.createElement('legend');
  legend.innerHTML = 'Rating:';
  radio.append(legend);

  for (let i = 1; i < 6; i++) {
    let name = `rating-${i}`;
    let label = document.createElement('label');
    label.setAttribute('for', name);
    label.className = 'radio-label';
    radio.append(label);

    let input = document.createElement('input');
    input.type = 'radio';
    input.id = name;
    input.name = 'rating';
    input.value = i;
    input.required = true;
    radio.append(input);
  }
  form.append(radio);

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
  form.append(comments);

  // Submit button
  const submit = document.createElement('div');
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.id = 'submit';
  submitButton.innerHTML = 'Submit Review';
  submit.append(submitButton);
  form.append(submit);

  // Have form appear above Reviews title to ensure on top/review button below
  container.insertBefore(form, header);
}

/**********    Handle actions on the close/submit buttons    **********/
function handleClickForm(restaurant) {

  const close = document.getElementById('close');
  close.onmouseover = () => {  // TODO find right version
    close.className = 'close-hover';
  };
  close.onmouseout = () => {  // TODO find right version
    close.className = '';
  };
  close.onclick = () => {
    console.log("being clicked");
    clearForm();
  };

  const submitButton = document.getElementById('submit');
  submitButton.addEventListener('click', () => {
    saveReview(restaurant.id);
  });
}

/**********    Remove the form when reviewer finished/clicks X   **********/
function clearForm() {
  const form = document.getElementById('form');
  form.remove();
}

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

/**********    Save review to the server    **********/
async function saveReview(id) {
  try {
    console.log("running saveReview()");
    const review = reviewData(id);
    const ping = await DBHelper.pingServer(DBHelper.REVIEWS_URL);
    if (ping == true) { DBHelper.addReview(review); }
    else { DBHelper.storeReview(review); }
    // window.location.href = `/restaurant.html?id=${id}`;
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
    const server = DBHelper.REVIEWS_URL;
    // const server = DBHelper.LOCAL_URL;
    const status = await DBHelper.pingServer(server);
    console.log("Results are: ", status);
  }
  catch(error) {
    console.error("Error while testing ping: ", error);
  }
}

function testOffline() {
  console.log("running test offline");
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

  console.log("Test ran");
}

function testStore() {
  console.log("Running test store");
  DBHelper.fetchOfflineStore();
}
