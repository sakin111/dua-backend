import cors from 'cors';
import express, {
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import router from './routes';

export const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Dua & Ruqyah API is running',
    data: null,
  });
});

app.use('/api', router);

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null,
  });
};

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
  });
};

app.use(notFoundHandler);
app.use(errorHandler);
