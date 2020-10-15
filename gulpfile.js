var gulp = require('gulp');
var rimraf = require('rimraf').sync;
var browser = require('browser-sync');
var concat = require('gulp-concat');
var mq4HoverShim = require('mq4-hover-shim');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var sourcemaps = require('gulp-sourcemaps');
var sass = require('gulp-sass');
var postcss = require('gulp-postcss');
var panini = require('panini');
var uglify = require('gulp-uglify');
var replace = require('gulp-string-replace');
var replaceName = require('gulp-replace-name');
var argv = require('yargs').argv;
var fileExists = require('file-exists');
var colors = require('colors');
var expect = require('gulp-expect-file');


// Add 3rd party js below, then run 'build'
var vendorJs = [
    'node_modules/jquery/dist/jquery.min.js',
    'node_modules/popper.js/dist/umd/popper.min.js',
    'node_modules/bootstrap/dist/js/bootstrap.min.js',
];

// Add my project js below
var appJs = [
    'src/js/signature.js',
    'src/js/config.js',
    'src/js/ui.js'
];

function getTaskName(self) {
    return self.process.title.split(' ')[1];
}




// Copy assets
gulp.task('copy', function (done) {
    gulp.src(['./src/assets/**/*'])
        .pipe(gulp.dest('./build/assets/'));
    gulp.src(['./node_modules/bootstrap/dist/css/*.css'])
        .pipe(gulp.dest('./build/css'));
    done();
});

// Erases the build folder
gulp.task('clean', function (done) {
    rimraf('./build');
    done();
});

gulp.task('compile-js', function () {
    return gulp.src(appJs)
        .pipe(concat('app.js'))
        .pipe(gulp.dest('./build/js/'))
    //.pipe(replace(new RegExp('staticFolder:""', 'g'), '"staticFolder":"/"'))
    //.pipe(uglify()) // use it when production (in Pimcore)
});

gulp.task('compile-vendor', function () {
    return gulp.src(vendorJs)
        .pipe(concat('vendor.js'))
        .pipe(gulp.dest('./build/js/'))
});

gulp.task('compile-sass', function () {

    var sassOptions = {
        errLogToConsole: true,
        outputStyle: 'expanded'
        // includePaths: bowerpath
    };

    // https://github.com/twbs/mq4-hover-shim
    var processors = [
        mq4HoverShim.postprocessorFor({
            hoverSelectorPrefix: '.bs-true-hover '
        }),
        autoprefixer({
            browsers: [
                'Chrome >= 35',
                'Firefox >= 31',
                'Edge >= 12',
                'Explorer >= 9',
                'iOS >= 8',
                'Safari >= 8',
                'Android 2.3',
                'Android >= 4',
                'Opera >= 12'
            ]
        })
    ];
    // Only 'build' task will minify the css
    if (getTaskName(this) == 'build') {
        processors.push(cssnano());
    }
    return gulp.src('./src/scss/app.scss')
        .pipe(sourcemaps.init())
        .pipe(sass(sassOptions).on('error', sass.logError))
        .pipe(postcss(processors))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./build/css/'));
});

gulp.task('compile-html', function (done) {
    gulp.src('./src/html/pages/**/*.html')
        .pipe(panini({
            root: './src/html/pages/',
            layouts: './src/html/layouts/',
            partials: './src/html/includes/',
            helpers: './src/html/helpers/',
            data: './src/html/data/'
        }))
        .pipe(replace('../../assets/', '/assets/')) // update the image paths to fit the build folder setup
        .pipe(gulp.dest('./build/'))
        .on('finish', function () {
            browser.reload();
            done();
        });
});

gulp.task('compile-html:reset', function (done) {
    panini.refresh();
    done();
});

// Watch files for changing
gulp.task('watch', function (done) {
    gulp.watch('./src/scss/**/*', gulp.series('compile-sass', function () {
        browser.reload();
    }));
    gulp.watch('./src/html/pages/**/*', gulp.series('compile-html'));
    gulp.watch(['./src/html/{layouts,includes,helpers,data}/**/*'], gulp.series('compile-html:reset', 'compile-html'));
    gulp.watch('./src/js/**/*', gulp.series('compile-js', function () {
        browser.reload();
    }));
    gulp.watch('./src/assets/**/*', gulp.series(function () {
        browser.reload();
    }));
    done();
});

gulp.task('build', gulp.parallel(
    gulp.series('clean', 'copy'),
    'compile-js', 'compile-vendor', 'compile-sass', 'compile-html'
));




// Starts a BrowerSync instance
gulp.task('server', gulp.series('build', function (done) {
    browser.init({
        server: './build',
        port: 8080
    });
    done();
}));

gulp.task('default', gulp.series('server', 'watch', function (done) {
    done();
}));
