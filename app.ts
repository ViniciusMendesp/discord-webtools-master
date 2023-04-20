import createError from 'http-errors';
import sessions from 'cookie-session';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import logger from 'morgan';

import indexRouter from './src/routes/index';
import usersRouter from './src/routes/users';

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  sessions({
    maxAge: 1000 * 60 * 60 * 24 * 12,
    name: 'session',
    secret: 'verylowsecurity',
    sameSite: 'lax',
  }),
);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (_req: Request, _res: Response, next: NextFunction) {
  next(createError(404));
});

interface AppError extends Error {
  status?: number;
}

// error handler
// eslint-disable-next-line no-unused-vars
app.use(function (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500); // verifique se a propriedade "status" existe antes de usá-la
  res.render('error');
});
