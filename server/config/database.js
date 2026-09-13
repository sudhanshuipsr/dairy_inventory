import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Ensure IPv4 first on dual-stack environments (prevents AWS ETIMEDOUT on Windows)
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // Also read from cwd if present


const DATABASE_URL = process.env.DATABASE_URL || '';
const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'dairy_inventory';

let sequelize;
let activeDatabaseType = 'in-memory';

try {
  if (DATABASE_URL) {
    // 1. Cloud Neon PostgreSQL Database
    activeDatabaseType = 'postgres';
    sequelize = new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: { timestamps: true }
    });
  } else if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
    // 2. MySQL
    activeDatabaseType = 'mysql';
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'mysql',
      logging: false,
      pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
      define: { timestamps: true }
    });
  } else {
    // 3. Local SQLite
    activeDatabaseType = 'sqlite';
    const sqliteStoragePath = process.env.DB_STORAGE || (
      process.env.VERCEL 
        ? '/tmp/database.sqlite' 
        : path.join(__dirname, '../database.sqlite')
    );

    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: sqliteStoragePath,
      logging: false,
      define: { timestamps: true }
    });
  }
} catch (err) {
  console.warn('[Database Init Graceful Fallback]:', err.message);
  activeDatabaseType = 'in-memory';
  sequelize = new Sequelize('sqlite::memory:', { logging: false });
}

export const connectDB = async () => {
  try {
    if (sequelize) {
      await sequelize.authenticate();
      console.log(`[Database] Connected successfully (${activeDatabaseType.toUpperCase()})`);
    }
  } catch (error) {
    console.warn('[Database Connection Graceful Fallback]:', error.message);
  }
};

export { sequelize, activeDatabaseType };
export default sequelize;
