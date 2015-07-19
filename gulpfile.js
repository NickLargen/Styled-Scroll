/* global Buffer */
'use-strict';

var projectName = 'Styled Scroll';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var exec = require('child_process').exec;
var through = require('through2');
var UglifyJS = require("uglify-js");
var applySourceMap = require('vinyl-sourcemaps-apply');
var browserSync = require("browser-sync").create(projectName);
var reload = browserSync.reload;

gulp.task(function serve() {
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

// Lint JavaScript
gulp.task(function jshint() {
    return gulp.src('src/**.js')
        .pipe(reload({ stream: true, once: true }))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));
});

function manualMinify(file, encoding, callback) {
    var toplevel_ast = UglifyJS.parse(String(file.contents));
    toplevel_ast.figure_out_scope();

    var compressor = UglifyJS.Compressor({ drop_console: true, hoist_vars: true });
    var compressed_ast = toplevel_ast.transform(compressor);
    compressed_ast.figure_out_scope();
    compressed_ast.compute_char_frequency();
    compressed_ast.mangle_names();
    
    // Only mangle properties that begin with a single underscore
    UglifyJS.mangle_properties(compressed_ast, { regex: /^_[^_]/ });

    var sourceMap = UglifyJS.SourceMap({ file: file.path });
    file.contents = new Buffer(compressed_ast.print_to_string({ comments: /^!/, source_map: sourceMap }));

    var map = JSON.parse(sourceMap);

    map.sources = [file.relative];
    applySourceMap(file, map);

    callback(null, file);
}

function minify() {
    return gulp.src('dist/styled-scroll.js')
        .pipe($.rename({
            extname: '.min.js'
        }))
        .pipe($.size({ title: 'Default' }))
        .pipe($.sourcemaps.init())
        .pipe(through.obj(manualMinify))
        .pipe($.size({ title: 'Minified' }))
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('dist'))
};

function bump(bumpType) {
    return function innerBumpFunction() {
        return gulp.src('./package.json')
            .pipe($.bump({ type: bumpType }))
            .pipe(gulp.dest('./'))
    };
};

function build() {
    var pkg = require('./package.json');
    var banner = '/*! <%= pkg.name %> v<%= pkg.version %> <%= new Date().toISOString() %>, Copyright <%= pkg.author %> (<%= pkg.license %>) */\n';

    return gulp.src('src/**.js')
        .pipe($.header(banner, { pkg: pkg }))
        .pipe(gulp.dest('dist'));
};

gulp.task('major', bump('major'));
gulp.task('minor', bump('minor'));
gulp.task('patch', bump('patch'));

gulp.task('default', gulp.series('serve'));
gulp.task('build', gulp.series('jshint', build, minify));