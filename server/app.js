import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { apiLimiter, mongoSanitize, requireXhrHeader } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1); // behind Vercel / reverse proxy: correct req.ip for rate limiting
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // Same-origin and server-to-server requests have no Origin header.
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Company-Id'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize);
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

// Ensure a DB connection on every request (cheap when cached; needed for serverless cold starts).
app.use(async (_req, _res, next) => {
  await connectDB();
  next();
});

app.use('/api', apiLimiter, requireXhrHeader, routes);
app.use(notFound);
app.use(errorHandler);

export default app;
