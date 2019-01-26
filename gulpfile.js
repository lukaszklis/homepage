const gulp = require("gulp");
const gulpLoadPlugins = require("gulp-load-plugins");
const browserSync = require("browser-sync").create();
const del = require("del");
const runSequence = require("run-sequence");
const autoprefixer = require("autoprefixer");
const postcssImport = require("postcss-import");
const postcssCustomMedia = require("postcss-custom-media");

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

let dev = true;

gulp.task("styles", () => {
  const plugins = [
    postcssImport(),
    postcssCustomMedia(),
    autoprefixer({ browsers: ["> 1%", "last 2 versions", "Firefox ESR"] })
  ];
  return gulp
    .src("app/styles/*.css")
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.postcss(plugins))
    .pipe($.if(dev, $.sourcemaps.write()))
    .pipe(gulp.dest(".tmp/styles"))
    .pipe(reload({ stream: true }));
});

gulp.task("scripts", () => {
  return gulp
    .src("app/scripts/**/*.js")
    .pipe($.plumber())
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.babel())
    .pipe($.if(dev, $.sourcemaps.write(".")))
    .pipe(gulp.dest(".tmp/scripts"))
    .pipe(reload({ stream: true }));
});

gulp.task("html", ["styles", "scripts"], () => {
  return gulp
    .src("app/*.html")
    .pipe($.useref({ searchPath: [".tmp", "app", "."] }))
    .pipe($.if(/\.js$/, $.uglify({ compress: { drop_console: true } })))
    .pipe($.if(/\.css$/, $.cssnano({ safe: true, autoprefixer: false })))
    .pipe(
      $.if(
        /\.html$/,
        $.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: { compress: { drop_console: true } },
          processConditionalComments: true,
          removeComments: true,
          removeEmptyAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        })
      )
    )
    .pipe($.cachebust({ type: "timestamp" }))
    .pipe(gulp.dest("dist"));
});

gulp.task("images", () => {
  return gulp
    .src("app/images/**/*")
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest("dist/images"));
});

gulp.task("fonts", () => {
  return gulp
    .src("app/fonts/**/*")
    .pipe($.if(dev, gulp.dest(".tmp/fonts"), gulp.dest("dist/fonts")));
});

gulp.task("extras", () => {
  return gulp
    .src(["app/*", "!app/*.html"], {
      dot: true
    })
    .pipe(gulp.dest("dist"));
});

gulp.task("clean", del.bind(null, [".tmp", "dist"]));

gulp.task("serve", () => {
  runSequence(["clean"], ["styles", "scripts", "fonts"], () => {
    browserSync.init({
      notify: false,
      port: 9000,
      server: {
        baseDir: [".tmp", "app"],
        routes: {
          "/scripts": ".tmp/scripts"
        }
      }
    });

    gulp
      .watch(["app/*.html", "app/images/**/*", ".tmp/fonts/**/*"])
      .on("change", reload);

    gulp.watch("app/styles/**/*.css", ["styles"]);
    gulp.watch("app/scripts/**/*.js", ["scripts"]);
    gulp.watch("app/fonts/**/*", ["fonts"]);
  });
});

gulp.task("serve:dist", ["default"], () => {
  browserSync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: ["dist"]
    }
  });
});

gulp.task("build", ["html", "images", "fonts", "extras"], () => {
  return gulp.src("dist/**/*").pipe($.size({ title: "build", gzip: true }));
});

gulp.task("default", () => {
  return new Promise(resolve => {
    dev = false;
    runSequence(["clean"], "build", resolve);
  });
});
