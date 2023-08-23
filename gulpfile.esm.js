import gulp from 'gulp';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';

const sass = gulpSass(dartSass);

export const css = () => {
    return gulp.src('scss/zweihammer-extras.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./'));
}

export const watchScss = () => gulp.watch('scss/*.scss', {ignoreInitial: false}, css);
