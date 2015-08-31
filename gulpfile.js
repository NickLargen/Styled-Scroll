/* global Buffer */
'use-strict';

var projectName = 'Styled Scroll';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var exec = require('child_process').exec;
var through = require('through2');
var UglifyJS = require('uglify-js');
var applySourceMap = require('vinyl-sourcemaps-apply');
var browserSync = require('browser-sync').create(projectName);
var seleniumStandalone = require('selenium-standalone');
var protractor = require("gulp-protractor").protractor;

var sourceFiles = 'src/**';

gulp.task(function serve() {
    // .init starts the server
    browserSync.init({
        server: {
            baseDir: '.',
            directory: true
        },
        startPath: 'demos/index.html',
        files: ['demos/**', sourceFiles],
        browser: ['chrome', 'firefox'],
        logLevel: 'info',
        host: '192.168.1.12',
        // Assume there is an active internet connection 
        online: true,
        // Don't show any notifications in the browser.
        // notify: false,
        // Log connections
        // logConnections: true,
        logPrefix: projectName,
        // Don't mirror actions
        ghostMode: false
    });
});



function jshint() {
    return gulp.src(sourceFiles)
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));
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
        .pipe($.gzip())
        .pipe($.size({ title: 'Gzipped', showFiles: true }))
};

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
    file.contents = new Buffer(compressed_ast.print_to_string({ comments: /^!/, source_map: sourceMap /* , beautify : true */ }));

    var map = JSON.parse(sourceMap);

    map.sources = [file.relative];
    applySourceMap(file, map);

    callback(null, file);
}



function bump(bumpType) {
    return function innerBumpFunction() {
        return gulp.src('./package.json')
            .pipe($.bump({ type: bumpType }))
            .pipe(gulp.dest('./'))
    };
};

gulp.task('major', bump('major'));
gulp.task('minor', bump('minor'));
gulp.task('patch', bump('patch'));



function build() {
    var pkg = require('./package.json');
    var banner = '/*! <%= pkg.name %> v<%= pkg.version %> <%= new Date().toISOString() %>, Copyright <%= pkg.author %> (<%= pkg.license %>) */\n';

    return gulp.src(sourceFiles)
        .pipe($.header(banner, { pkg: pkg }))
        .pipe(gulp.dest('dist'));
};



gulp.task('selenium', function (done) {
    seleniumStandalone.install({
        logger: function (message) { console.log(message); }
    }, function (err) {
        if (err) return done(err);

        seleniumStandalone.start(function (err, child) {
            if (err) return done(err);
            child.stderr.on('data', function (data) {
                console.log(data.toString());
            });

            seleniumStandalone.child = child;
            done();
        });
    });
});

function seleniumStop(done) {
    seleniumStandalone.child.kill();
    done();
}

gulp.task('uitest', function () {
    return gulp.src("spec.js")
        .pipe(protractor({
            configFile: "test/protractor.conf.js",
            args: ['--seleniumAddress', 'http://localhost:4444/wd/hub']
        }))
        .on('error', function (e) { throw e });
});

gulp.task('test', gulp.series('selenium', 'uitest', seleniumStop));









//istanbul-combine -r html coverage/**/*.json


gulp.task('unit', function () {
    browserSync.init({
        server: {
            baseDir: ['test/unit-tests', '.'],
            index: 'SpecRunner.html'
        },
        files: ['test/unit-tests/spec/**', sourceFiles],
        browser: ['chrome'],
        logLevel: 'info',
        host: '192.168.1.12',
        online: true,
        logPrefix: 'Test',
        ghostMode: false
    });
})







// Lint JavaScript
gulp.task('lint', gulp.series(jshint));

gulp.task('default', gulp.series('serve'));
gulp.task('build', gulp.series('lint', build, minify));

