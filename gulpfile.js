require('babel-polyfill');
const gulp = require('gulp');
const loadPlugins = require('gulp-load-plugins');
const del = require('del');
const glob = require('glob');
const path = require('path');
const isparta = require('isparta');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const babel = require('gulp-babel');
const coveralls = require('gulp-coveralls');

const Instrumenter = isparta.Instrumenter;
const mochaGlobals = require('./test/setup/.globals');
const manifest = require('./package.json');

// Load all of our Gulp plugins
const $ = loadPlugins();

// Gather the library data from `package.json`
const config = manifest.babelBoilerplateOptions;
const mainFile = manifest.main;
const destinationFolder = path.dirname(mainFile);
const exportFileName = config.mainVarName

function cleanDist(done) {
  del([destinationFolder]).then(() => done());
}

function cleanTmp(done) {
  del(['tmp']).then(() => done());
}

// Lint a set of files
function lint(files) {
  return gulp.src(files)
    .pipe(babel())
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError());
}

function lintSrc() {
  return lint('src/**/*.js');
}

function lintTest() {
  return lint('test/unit/**/*.js');
}

function lintGulpfile() {
  return lint('gulpfile.js');
}

function _mocha() {
  return gulp.src(['test/setup/node.js', 'test/unit/**/*.js'], {
      read: false
    })
    .pipe($.mocha({
      // reporter: 'dot',
      globals: Object.keys(mochaGlobals.globals),
      ignoreLeaks: false,
      asyncOnly: true
    }));
}

function _registerBabel() {
  require('babel-register');
}

function test() {
  return _mocha();
}

function coverage(done) {
  _registerBabel();
  gulp.src(['src/**/*.js'])
    .pipe($.istanbul({
      instrumenter: Instrumenter,
      includeUntested: true
    }))
    .pipe($.istanbul.hookRequire())
    .on('finish', () => {
      return test()
        .pipe($.istanbul.writeReports())
        .on('end', () => {
          gulp.src('./coverage/**/lcov.info')
            .pipe(coveralls()).on('finish', done);
        });
    });

}

function build() {
  return gulp.src(config.entryFileName)
    .pipe(webpackStream({
      target: 'node',
      output: {
        filename: `${exportFileName}.min.js`,
        library: true,
        libraryTarget: 'commonjs2'
      },
      externals: [
        "debug", "diff", "fs-extra", "git-node"
      ],
      module: {
        loaders: [{
          test: /\.json$/,
          loader: 'json-loader'
        }, {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader'
        }]
      }
      // ,devtool: 'source-map'
    }))
    .pipe(gulp.dest(destinationFolder))
    .pipe($.filter(['**', '!**/*.js.map']))
    .pipe($.rename(`${exportFileName}.min.js`))
    // .pipe($.sourcemaps.init({
    //   loadMaps: true
    // }))
    // .pipe($.uglify())
    // .pipe($.sourcemaps.write('./'))
    // .pipe(gulp.dest(destinationFolder));
}

const watchFiles = ['src/**/*', 'test/**/*', 'package.json', '**/.eslintrc'];

// Run the headless unit tests as you make changes.
function watch() {
  gulp.watch(watchFiles, ['test']);
}

// Remove the built files
gulp.task('clean', cleanDist);

// Remove our temporary files
gulp.task('clean-tmp', cleanTmp);

// Lint our source code
gulp.task('lint-src', lintSrc);

// Lint our test code
gulp.task('lint-test', lintTest);

// Lint this file
gulp.task('lint-gulpfile', lintGulpfile);

// Lint everything
// gulp.task('lint', ['lint-src', 'lint-test', 'lint-gulpfile']);
gulp.task('lint', ['lint-src', 'lint-gulpfile']);

// Lint and run our tests
gulp.task('test', ['lint'], test);

// Set up coverage and run tests
gulp.task('coverage', ['lint'], coverage);

// Run the headless unit tests as you make changes.
gulp.task('watch', watch);

// An alias of test
gulp.task('default', ['test']);

//build
gulp.task('build', ['lint', 'clean'], build);
