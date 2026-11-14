import 'dotenv/config';
import { app } from './app';

const port = Number(process.env.PORT) || 4000;

export const startServer = () =>
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

startServer();
