/**********    Requires for Gulp dependencies    **********/
const gulp = require('gulp');

// For syncing browser
const browserSync = require('browser-sync').create();  // Auto-reload browser
const reload = browserSync.reload;

// For some processes
const sourcemaps = require('gulp-sourcemaps');  // Write source map file
const rename = require('gulp-rename');  // Change name as part of task

// For handling scripts
const babel = require('gulp-babel');  // Allows older browsers to use app
const uglify = require('gulp-uglify');  // Minify js

// For minifying CSS
const autoprefixer = require('gulp-autoprefixer');  // Adds browser-specific prefixes
const cleanCSS = require('gulp-clean-css');  // Minify css

// For resizing and minifying images
const imageResize = require('gulp-image-resize');  // Batch image resize
const imagemin = require('gulp-imagemin');  // Minify images
const imageminWebp = require('imagemin-webp');  // webp compression as jpeg

// For starting over
const del = require('del');  // Delete files and folders


/**********    Development    **********/

// Gulp recommends always keeping a 'default task'
gulp.task('default', ['clean', 'build']);

// Delete Build folder
gulp.task('clean', () =>
  del.sync('build')
);

// Start tasks for producing build folder
gulp.task('build', [
  'clean',
  'styles',
  'scripts',
  'scripts-sw',
  'copy',
  'images'
]);

/**********    Start browserSync server    **********/

// Start serving src folder
gulp.task('serve', ['styles', 'scripts', 'scripts-sw', 'copy'], () => {
  browserSync.init({
    server: './src',
    port: 8000,
  });
  gulp.watch('src/css/*.css', ['styles']).on('change', reload);
  gulp.watch('src/js/*.js', ['scripts']).on('change', reload);
  gulp.watch('src/*.js', ['scripts-sw']).on('change', reload);
  gulp.watch('src/*.html', ['copy']).on('change', reload);
});

// Start serving build folder
gulp.task('serve-build', ['styles', 'scripts', 'scripts-sw', 'copy'], () => {
  browserSync.init({
    server: './build',
    port: 8000,
  });
  gulp.watch('src/css/*.css', ['styles']).on('change', reload);
  gulp.watch('src/js/*.js', ['scripts']).on('change', reload);
  gulp.watch('src/*.js', ['scripts-sw']).on('change', reload);
  gulp.watch('src/*.html', ['copy']).on('change', reload);
});


/**********    Build tasks    **********/

// Process and minify css, copy to build folder
gulp.task('styles', () =>
  gulp.src('src/css/*.css')
    .pipe(sourcemaps.init())
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build/css'))
);

// Process and uglify js, copy to build folder
gulp.task('scripts', () =>
  gulp.src('src/js/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['env']
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build/js'))
);

// Process and uglify sw, copy to build folder
gulp.task('scripts-sw', () =>
  gulp.src('src/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['env']
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('build'))
);

// Copy files to build folder
gulp.task('copy', () =>
  gulp.src([
    'src/*.html',
    'src/manifest.json'
  ])
    .pipe(gulp.dest('build'))
);

/**********    Image Handling    **********/

// Minify images and copy to build folder
gulp.task('images', () =>
  gulp.src('src/img/*')
    .pipe(imagemin([
      imageminWebp({
        quality: 70  // default 75
      })]))
    .pipe(gulp.dest('build/img'))
);

// Delete Imgs folder
gulp.task('clean-img', () =>
  del.sync('src/img')
);

// Preprocess images and move to src/img folder
gulp.task('image-pre', [
  'image-resize-255',
  'image-resize-490',
  'image-static'
]);

gulp.task('image-resize-255', () =>
  gulp.src('src/img-src/*')
    .pipe(imageResize({
      width: 255,
      imageMagick: true
    }))
    .pipe(rename(path => { path.basename += '-255'; }))
    .pipe(gulp.dest('src/img'))
);

gulp.task('image-resize-490', () =>
  gulp.src('src/img-src/*')
    .pipe(imageResize({
      width: 490,
      imageMagick: true
    }))
    .pipe(rename(path => { path.basename += '-490'; }))
    .pipe(gulp.dest('src/img'))
);

// Copy static images to src/img folder
gulp.task('image-static', () =>
  gulp.src([
    'src/img-static/*.jpg',
    'src/img-src/*.jpg'
  ])
    .pipe(gulp.dest('src/img'))
);
