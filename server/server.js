import app, { ensureDbConnected } from './app.js';
import { initCronJobs } from './services/cronService.js';
import { activeDatabaseType } from './config/database.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await ensureDbConnected();
    initCronJobs();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` 🥛 Mother Dairy ERP Engine running on Port ${PORT}`);
      console.log(` Database: ${activeDatabaseType.toUpperCase()}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(` Default Admin: admin@dairy.com / admin123`);
      console.log(` Owner Admin: sudhanshuipsr@gmail.com / sud@1989`);
      console.log(` Default Staff: staff@dairy.com / staff123`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    app.listen(PORT, () => {
      console.log(`[Server Started on ${PORT} with DB Warning]`);
    });
  }
};

startServer();
