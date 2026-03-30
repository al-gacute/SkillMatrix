import dotenv from 'dotenv';

dotenv.config();

type DefaultAdminAccount = {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
};

const defaultAdminAccounts: DefaultAdminAccount[] = [
    {
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@skillmatrix.com',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
        firstName: process.env.DEFAULT_ADMIN_FIRST_NAME || 'System',
        lastName: process.env.DEFAULT_ADMIN_LAST_NAME || 'Administrator',
    },
    {
        email: process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@skillmatrix.com',
        password: process.env.DEFAULT_SUPERADMIN_PASSWORD || 'Super@123',
        firstName: process.env.DEFAULT_SUPERADMIN_FIRST_NAME || 'Super',
        lastName: process.env.DEFAULT_SUPERADMIN_LAST_NAME || 'Admin',
    },
];

export const config = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatrix',
    jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    nodeEnv: process.env.NODE_ENV || 'development',
    defaultAdminAccounts,
    highLevelAccountEmails: defaultAdminAccounts.map((account) => account.email.toLowerCase()),
    syncDefaultAdminPasswords: process.env.SYNC_DEFAULT_ADMIN_PASSWORDS !== 'false',
};
