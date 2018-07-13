const gulp = require('gulp');

// For syncing browser
const browserSync = require('browser-sync').create();  // Auto-reload browser
const reload = browserSync.reload;

// For all processes
const sourcemaps = require('gulp-sourcemaps');  // Write source map file
const concat = require('gulp-concat'); // Concat files

// For handling scripts
const babel = require('gulp-babel');  // Allows older browsers to use app
const uglify = require('gulp-uglify');  // Minify js

// For minifying CSS
const autoprefixer = require('gulp-autoprefixer');  // Adds browser-specific prefixes
const cleanCSS = require('gulp-clean-css');  // Minify css

// For minifying HTML
const htmlmin = require('gulp-htmlmin');  // Minify html

// For minifying images
const webp = require('gulp-webp');  // Convert images to webp TODO Keep??
const imagemin = require('gulp-imagemin');  // Minify images

// For starting over
const del = require('del');  // Delete files and folders


// Development  TODO Finalize task organization and make requires match

// Gulp recommends always keeping a 'default task'
gulp.task('default', ['clean', 'build']);

// Delete Build folder
gulp.task('clean', () =>
  del.sync('build')
);

// Start tasks for producing build folder
gulp.task('build', [
  'clean',
  'scripts',
  'styles',
  'html',
  'images'
]);

// Start browserSync server
// Reload works now!!!
gulp.task('serve', ['styles', 'scripts', 'html'], () => {
  browserSync.init({
    server: './src',
    port: 8000,
  });
  gulp.watch('src/css/*.css', ['styles']).on('change', reload);
  gulp.watch('src/js/*.js', ['scripts']).on('change', reload);
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
    .pipe(concat('app.css'))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build'))
);

// Process and uglify js, copy to build folder
// TODO Check pipe order. Decide if using concat
gulp.task('scripts', () =>
  gulp.src('src/js/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['env']
    }))
    .pipe(uglify())
    .pipe(concat('app.js'))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build'))
);

// Minify html and copy to build folder
gulp.task('html', () =>
  gulp.src('src/*.html')
    .pipe(sourcemaps.init())
    .pipe(htmlmin())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build'))
);

// Clean up and minify images
// TODO Check pipe order. Decide if using webp.  Consider imagemin-webp
gulp.task('images', () =>
  gulp.src('src/img/*')
    .pipe(webp())
    .pipe(imagemin([
      imagemin.jpegtran({progressive: true})  // TODO: Decide whether to keep
    ]))
    .pipe(gulp.dest('build/img'))
);

// TODO Determine if need addl error handling beyond default
