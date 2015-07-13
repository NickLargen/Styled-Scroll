'use-strict';

var projectName = 'Styled Scroll';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var exec = require('child_process').exec;
var browserSync = require("browser-sync").create(projectName);
var reload = browserSync.reload;

gulp.task('serve', function () {
    // .init starts the server
    browserSync.init({
        server: {
            baseDir: ".",
            index: "demos/index.html"
        },
        files: ["demos/**", "src/**"],
        browser: ["chrome", "firefox"],
        logLevel: 'info',
        host: "192.168.1.12",
        // Assume there is an active internet connection 
        online: true,
        // Don't show any notifications in the browser.
        // notify: false,
        // Log connections
        // logConnections: true,
        logPrefix: projectName
    });
});

gulp.task('default', ['serve']);
gulp.task('build', ['jshint', 'minify']);


// Lint JavaScript
gulp.task('jshint', function () {
    return gulp.src('src/**.js')
        .pipe(reload({ stream: true, once: true }))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('minify', function() {
    return gulp.src('src/**.js')
        .pipe($.size({ title: 'Default' }))
        .pipe($.uglify({ compress: { drop_console: true } }))
        .pipe($.rename({
            extname: '.min.js'
        }))
        .pipe($.size({ title: 'Minified' }))
        .pipe(gulp.dest('dist'))
        .pipe($.gzip())
        .pipe($.size({ title: 'Gzipped' }))
        .pipe(gulp.dest('dist'));
});