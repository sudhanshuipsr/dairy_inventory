import { connectDB, sequelize, activeDatabaseType } from '../config/database.js';

async function checkSize() {
  await connectDB();
  console.log(`Connected engine: ${activeDatabaseType.toUpperCase()}\n`);

  if (activeDatabaseType !== 'postgres') {
    console.log('Not connected to PostgreSQL.');
    process.exit(0);
  }

  // 1. Total Database Size
  const [dbSizeRes] = await sequelize.query(`
    SELECT 
      current_database() as database_name,
      pg_database_size(current_database()) as size_bytes,
      pg_size_pretty(pg_database_size(current_database())) as size_pretty;
  `);

  const dbInfo = dbSizeRes[0];
  const sizeBytes = Number(dbInfo.size_bytes);
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  const neonFreeTierLimitMB = 500; // Neon Free Tier gives 500 MB (0.5 GB) storage
  const usedPercent = ((sizeMB / neonFreeTierLimitMB) * 100).toFixed(2);
  const remainingMB = (neonFreeTierLimitMB - sizeMB).toFixed(2);

  console.log('==================================================');
  console.log('       NEON POSTGRESQL DATABASE STORAGE USAGE     ');
  console.log('==================================================');
  console.log(`Database Name     : ${dbInfo.database_name}`);
  console.log(`Current Total Size: ${dbInfo.size_pretty} (${sizeMB} MB)`);
  console.log(`Neon Free Limit   : 500.00 MB (0.5 GB)`);
  console.log(`Space Used        : ${usedPercent}%`);
  console.log(`Space Remaining   : ${remainingMB} MB (${(100 - usedPercent).toFixed(2)}% free)\n`);

  // 2. Table-by-Table breakdown
  const [tablesRes] = await sequelize.query(`
    SELECT
      c.relname AS table_name,
      COALESCE(s.n_live_tup, 0) AS row_count,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_size_pretty(pg_relation_size(c.oid)) AS table_data_size,
      pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
      pg_total_relation_size(c.oid) AS total_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC;
  `);

  console.log('TABLE-BY-TABLE DETAILED USAGE:');
  console.log('----------------------------------------------------------------------');
  console.log('Table Name'.padEnd(20) + 'Rows'.padStart(8) + 'Table Data'.padStart(14) + 'Index Size'.padStart(14) + 'Total Size'.padStart(14));
  console.log('----------------------------------------------------------------------');

  let appTablesBytes = 0;
  tablesRes.forEach(t => {
    appTablesBytes += Number(t.total_bytes);
    console.log(
      String(t.table_name).padEnd(20) +
      String(t.row_count || 0).padStart(8) +
      String(t.table_data_size).padStart(14) +
      String(t.index_size).padStart(14) +
      String(t.total_size).padStart(14)
    );
  });

  const appTablesMB = (appTablesBytes / (1024 * 1024)).toFixed(3);
  console.log('----------------------------------------------------------------------');
  console.log(`App User Data Total : ${(appTablesBytes / 1024).toFixed(1)} KB (~${appTablesMB} MB)`);
  console.log('======================================================================\n');

  process.exit(0);
}

checkSize().catch(err => {
  console.error('Error checking db size:', err);
  process.exit(1);
});
