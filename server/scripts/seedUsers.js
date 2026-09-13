import bcrypt from 'bcryptjs';
import { connectDB, sequelize, activeDatabaseType } from '../config/database.js';
import User from '../models/User.js';

const seedUsers = async () => {
  try {
    console.log(`Connecting to database (${activeDatabaseType})...`);
    await connectDB();
    await sequelize.sync();

    const salt = await bcrypt.genSalt(10);

    // 1. Seed Admin User
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    const [admin, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@dairy.com' },
      defaults: {
        name: 'Mother Dairy Admin',
        email: 'admin@dairy.com',
        password: adminPasswordHash,
        role: 'admin',
        phone: '+91 98100 00001',
        isActive: true
      }
    });

    if (!adminCreated) {
      admin.password = adminPasswordHash;
      admin.role = 'admin';
      admin.name = 'Mother Dairy Admin';
      admin.isActive = true;
      await admin.save();
      console.log('✓ Admin user updated: admin@dairy.com / admin123 (role: admin)');
    } else {
      console.log('✓ Admin user created: admin@dairy.com / admin123 (role: admin)');
    }

    // 2. Seed Staff User
    const staffPasswordHash = await bcrypt.hash('staff123', salt);
    const [staff, staffCreated] = await User.findOrCreate({
      where: { email: 'staff@dairy.com' },
      defaults: {
        name: 'Store Staff Counter',
        email: 'staff@dairy.com',
        password: staffPasswordHash,
        role: 'staff',
        phone: '+91 98100 00002',
        isActive: true
      }
    });

    if (!staffCreated) {
      staff.password = staffPasswordHash;
      staff.role = 'staff';
      staff.name = 'Store Staff Counter';
      staff.isActive = true;
      await staff.save();
      console.log('✓ Staff user updated: staff@dairy.com / staff123 (role: staff)');
    } else {
      console.log('✓ Staff user created: staff@dairy.com / staff123 (role: staff)');
    }

    console.log('\n--- Seeding Summary ---');
    console.log(`Admin Login: admin@dairy.com | admin123 (ID: ${admin.id})`);
    console.log(`Staff Login: staff@dairy.com | staff123 (ID: ${staff.id})`);
    process.exit(0);
  } catch (error) {
    console.error('Seed Users Error:', error);
    process.exit(1);
  }
};

seedUsers();
