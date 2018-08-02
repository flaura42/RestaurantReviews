# Restaurant Reviews
---
#### _This is a project being completed as part of Udacity's Mobile Web Specialist Nanodegree program.  It is being completed in three stages and this is the second stage._



## Project Setup Steps
To view the site in a browser, you will need to clone the project:
1. Clone project `git clone https://github.com/flaura42/restaurant.git`
2. Launch dev server: `node server` (See note below)
3. Install npm: `npm install`
4. Build the project: `gulp build`
5. Launch project server: `gulp serve`
6. Do a hard reload of the page before running Lighthouse (or so I heard)

The project should pass all tests regardless of whether or not "Simulate throttling" is selected.  I have added a recent report to the project folder for reference: `https://github.com/flaura42/restaurant/blob/master/LighthouseReport.pdf`

If for some reason the resized images don't show up, please run `gulp image-resize` and then re-run `gulp build`.  This shouldn't be an issue.


Note: This project requires the Stage 2 Dev Server.  If you haven't already cloned it, please do so: ` git clone https://github.com/udacity/mws-restaurant-stage-2.git`
To start the server: cd into the directory and enter `node server`


## Stage Details

### Stage One
1. Take a static design and make it responsive on different sized displays.
2. Make site accessible for screen reader use.
3. Add a service worker as first step of making site available offline.

### Stage Two
1. Pull data from server and make app work offline.
2. Maintain accessible features and responsive design
3. Improve performance and exceed Lighthouse targets.
