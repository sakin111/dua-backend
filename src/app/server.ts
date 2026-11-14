import 'dotenv/config';
import { app } from './app';
import { init } from './db/connection';

const port = Number(process.env.PORT) || 4000;

export const startServer = async (): Promise<void> => {
  await init();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

void startServer().catch((error: unknown) => {
  console.error('Failed to initialize the database or start the server.', error);
  process.exitCode = 1;
});
