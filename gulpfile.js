'use strict';

const gulp = require('gulp'), //基础库
    del = require('del'), //清除文件
    sass = require('gulp-sass'), //sass
    autoprefixer = require('gulp-autoprefixer'), //CSS加前缀
    // babel = require('gulp-babel'), //es6编译
    uglify = require('gulp-uglify'), //js压缩
    pump = require('pump'), //流
    htmlmin = require('gulp-htmlmin'), //html压缩
    runSequence = require('run-sequence'), //指定gulp任务顺序
    browserSync = require('browser-sync').create(),
    rev = require('gulp-rev'), //加hash
    revReplace = require("gulp-rev-replace"), //修改加hash后的路径
    rename = require("gulp-rename"), //重命名
    imagemin = require('gulp-imagemin'), //img压缩
    sftp = require('gulp-sftp'),
    webpack = require('gulp-webpack');

//gulp 上传
gulp.task('upload', function() {
    var workDirectory = 'xxx';
    return gulp.src('ly.txt')
        .pipe(sftp({
            host: '123.56.72.216',
            user: 'liuyang',
            pass: 'ly123456!@#',
            // port: '22'
            // key: config.sftp.key,
            // pass: config.sftp.pass,
            // remotePath: config.sftp.remotePath+objectDirectoryName
        }));
});


//源文件位置
const src = {
    js: 'src/public/js/*/*.js',
    es6: ['src/public/js/views/*.es'],
    css: 'src/public/sass/*.scss',
    img: 'src/public/images/**',
    html: 'src/page/*.html'
};

//临时目录
const temp = {
    dir: 'temp',
    js: 'temp/public/js',
    es6: 'temp/public/js/views',
    css: 'temp/public/css',
    img: 'temp/public/images',
    html: 'temp'
}

//发布文件位置
const dist = {
    dir: 'dist',
    js: 'dist/public/js',
    css: 'dist/public/css',
    img: 'dist/public/images',
    html: 'dist'
};

//帮助 
gulp.task('help', () => {

    // console.log('	gulp default:watch		打包监听');

    console.log('	gulp clean			文件清除');

    console.log('	gulp help			gulp参数说明');

    console.log('	gulp develop			开发环境');

    console.log('	gulp production			生产环境');

    console.log('	gulp develop:watch		开发环境监听');

});

//默认
gulp.task('default', () => {
    gulp.start('help');
});

//清除
gulp.task('clean', () => {
    return del(['dist']);
});

//sass编译压缩  outputStyle解析后的css格式 有四种取值分别为：nested，expanded，compact，compressed。
gulp.task('sass', ['clean'], () => {
    return gulp.src(src.css)
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(gulp.dest(temp.css));
});

//css浏览器兼容
gulp.task('min-css', ['sass'], () => {
    return gulp.src(temp.css + '/**')
        .pipe(autoprefixer({
            browsers: ['last 2 versions', 'chrome > 20'],
            cascade: false
        }))
        .pipe(gulp.dest(temp.css));
});

// //babel转换
// gulp.task('babel', ['clean'], () => {
//     gulp.src(src.es6)
//         .pipe(babel({
//             presets: ['es2015']
//         }))
//         .pipe(rename(function(path) {
//             path.extname = ".js"
//         }))
//         .pipe(gulp.dest(temp.es6));
// });


//webpack
gulp.task('webpack', function() {
    return gulp.src(src.es6)
        .pipe(webpack({
            entry: {
                "index": './src/public/js/views/index.es'
            },
            output: {
                filename: '[name].js'
            },
            // watch: true,
            module: {
                loaders: [{
                    test: /\.es$/,
                    loader: ['babel-loader'],
                    query: {
                        presets: ['es2015-loose'],
                        // plugins: ['transform-runtime']
                    }
                }],
                postLoaders: [{
                    test: /\.es$/,
                    loaders: ['es3ify-loader']
                }]
            }
        }))
        .pipe(rename(function(path) {
            path.extname = ".js"
        }))
        .pipe(gulp.dest(temp.es6));
})

//js库移动位置
gulp.task('move-js', () => {
    gulp.src(src.js)
        .pipe(gulp.dest(temp.js));
})

//js文件压缩
gulp.task('compress', ['webpack', 'move-js'], (cb) => {
    pump([
            gulp.src(temp.es6 + "/**"),
            uglify(),
            gulp.dest(temp.es6)
        ],
        cb
    )
});

//html压缩
gulp.task('min-html', ['clean'], () => {
    return gulp.src(src.html)
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest(dist.html));
});

//html只移动
gulp.task('move-html', () => {
    gulp.src(src.html)
        .pipe(gulp.dest(temp.html));
})

//image压缩
gulp.task('min-image', () =>
    gulp.src(src.img)
    .pipe(imagemin())
    .pipe(gulp.dest(temp.img))
);

//加hash
gulp.task("revision", function() {
    return gulp.src(temp.dir + "/**")
        .pipe(rev())
        .pipe(gulp.dest(dist.dir))
        .pipe(rev.manifest())
        .pipe(gulp.dest(dist.dir))
});

//加hash后修改路径
gulp.task("revreplace", ["revision"], function() {
    var manifest = gulp.src(dist.dir + "/rev-manifest.json");
    return gulp.src(dist.dir + "/**")
        .pipe(revReplace({ manifest: manifest }))
        .pipe(gulp.dest(dist.dir));
});

// // 启动服务
// gulp.task('browser-sync', function() {

// });

let browserSyncFn = function(dir) {
    return browserSync.init({
        server: {
            baseDir: dir
        }
    });
};

//清楚临时目录
gulp.task('cleanTemp', function() {
    return del(['temp']);
});
// develop
//正式构建开发环境
gulp.task('build-develop', function(cb) {
    runSequence(
        'cleanTemp', ['sass', 'webpack', 'move-html', 'move-js', 'min-image'],
        cb);
})

//正式构建生产环境
gulp.task('build-production', function(cb) {
    runSequence(
        'clean',
        'cleanTemp', ['sass', 'webpack'], ['min-css', 'min-html', 'compress', 'min-image'],
        'revreplace',
        'cleanTemp',
        cb);
});

//开发环境
gulp.task('develop', ['build-develop'], () => {
    browserSyncFn(temp.dir);
});
//生产环境
gulp.task('production', ['build-production'], () => {
    browserSyncFn(dist.dir);
});

//开发环境监听
gulp.task('develop:watch', ['develop'], () => {
    //监听源文件
    gulp.watch('src/**', ['build-develop']);
    //刷新页面
    gulp.watch(temp.html + "/*.html").on("change", browserSync.reload);
});
