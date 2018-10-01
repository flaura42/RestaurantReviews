# Restaurant Reviews
---
#### _This is a project being completed as part of Udacity's Mobile Web Specialist Nanodegree program.  It is being completed in three stages and this is the third stage._



## Project Setup Steps
To view the site in a browser, you will need to clone the project:
1. Clone project `git clone https://github.com/flaura42/restaurant.git`
2. Launch dev server: `node server` (See note below)
3. Install npm: `npm install`
4. Install gulp: `npm i gulp`
5. Launch project server: `gulp serve`
6. Do a hard reload of the page before running Lighthouse (or so I heard)

Note: Although I do have a build task in my gulpfile, it is not currently working due to my decision to change to async/await.  Since I was able to pass all Lighthouse benchmarks easily without it, I decided not to fix the issue at this time.  Please 'serve' the src folder, which can be done with `gulp serve`.

The project should pass all tests regardless of whether or not "Simulate throttling" is selected.

## Stage Details

### Stage One
1. Take a static design and make it responsive on different sized displays.
2. Make site accessible for screen reader use.
3. Add a service worker as first step of making site available offline.

### Stage Two
1. Pull data from server and make app work offline.
2. Maintain accessible features and responsive design
3. Improve performance and exceed Lighthouse targets.

### Stage Three
1. Enable users to mark restaurants as favorites.
2. Add a form to enable users to submit reviews.
3. Allow users to add reviews even if offline.
4. Have offline reviews submitted to server when re-connected
5. Meet stricter Lighthouse targets.
