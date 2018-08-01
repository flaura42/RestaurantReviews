const gulp = require('gulp');

// For syncing browser
const browserSync = require('browser-sync').create();  // Auto-reload browser
const reload = browserSync.reload;

// For (nearly) all processes
const sourcemaps = require('gulp-sourcemaps');  // Write source map file
const concat = require('gulp-concat'); // Concat files

// For handling scripts
const babel = require('gulp-babel');  // Allows older browsers to use app
const uglify = require('gulp-uglify');  // Minify js

// For minifying CSS
const autoprefixer = require('gulp-autoprefixer');  // Adds browser-specific prefixes
const cleanCSS = require('gulp-clean-css');  // Minify css

// For minifying images
const imagemin = require('gulp-imagemin');  // Minify images
const imageminWebp = require('imagemin-webp');  // webp compression as jpeg

// For starting over
const del = require('del');  // Delete files and folders


// Development  TODO Finalize task organization

// Gulp recommends always keeping a 'default task'
gulp.task('default', ['clean', 'build']);

// Delete Build folder
gulp.task('clean', () =>
  del.sync('build')
);

// Start tasks for producing build folder
gulp.task('build', [
  'styles',
  'scripts',
  'copy',
  'images'
]);

// Start browserSync server
// Reload works now!!!
gulp.task('serve', ['styles', 'scripts', 'copy'], () => {
  browserSync.init({
    server: './src',
    port: 8000,
  });
  gulp.watch('src/css/*.css', ['styles']).on('change', reload);
  gulp.watch('src/js/*.js', ['scripts']).on('change', reload);
  gulp.watch('src/*.js', ['sw']).on('change', reload);
  gulp.watch('src/*.html', ['html']).on('change', reload);
});

// Start serving Build folder
gulp.task('serve-build', ['styles', 'scripts', 'copy'], () => {
  browserSync.init({
    server: './build',
    port: 8000,
  });
  gulp.watch('src/css/*.css', ['styles']).on('change', reload);
  gulp.watch('src/js/*.js', ['scripts']).on('change', reload);
  gulp.watch('src/*.js', ['sw']).on('change', reload);
  gulp.watch('src/*.html', ['html']).on('change', reload);
});


// Build tasks

// Process and minify css, copy to build folder
// TODO Check pipe order. Decide if using concat
gulp.task('styles', () =>
  gulp.src('src/css/*.css')
    .pipe(sourcemaps.init())
    .pipe(autoprefixer({  // TODO Double-check if ok w/SM
      browsers: ['last 2 versions'],
      cascade: false
    }))
    // .pipe(concat('app.css'))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('./maps'))
    // .pipe(gulp.dest('build'))
    .pipe(gulp.dest('build/css'))
);

// Process and uglify js, copy to build folder
// TODO Update: Pipe order matches NPM (except not uglify)
gulp.task('scripts', () =>
  gulp.src('src/js/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['env']
    }))
    .pipe(uglify())
    // .pipe(concat('app.js'))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build'))
    .pipe(gulp.dest('build/js'))
);

// Copy SW to build folder TODO: add pipes?
gulp.task('sw', () =>
  gulp.src('src/*.js')
    .pipe(gulp.dest('build'))
);



// Copy html to build folder
gulp.task('html', () =>
  gulp.src('src/*.html')
    .pipe(gulp.dest('build'))
);

// Copy files to build folder
gulp.task('copy', () =>
  gulp.src([
    'src/*.js',
    'src/*.html'
  ])
    .pipe(gulp.dest('build'))
);

// Minify images and copy to build folder
gulp.task('images', () =>
  gulp.src('src/img/*')
    .pipe(imagemin([
      imageminWebp({
        quality: 70,  // default 75
        progressive: true
      })]))
    .pipe(gulp.dest('build/img'))
);


// TODO Determine if need addl error handling beyond default
