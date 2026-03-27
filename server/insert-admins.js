const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    role: String,
    roleLevel: Number,
    avatar: String,
    isApproved: Boolean,
    isActive: Boolean,
    createdAt: Date,
    updatedAt: Date,
});

const User = mongoose.model('User', userSchema);

async function insertAdmins() {
    await mongoose.connect('mongodb://localhost:27017/skillmatrix');

    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const superPassword = await bcrypt.hash('Super@123', 10);

    await User.insertMany([
        {
            email: 'admin@skillmatrix.com',
            password: adminPassword,
            firstName: 'System',
            lastName: 'Administrator',
            role: 'admin',
            roleLevel: 6,
            avatar: '',
            isApproved: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            email: 'superadmin@skillmatrix.com',
            password: superPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'admin',
            roleLevel: 6,
            avatar: '',
            isApproved: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ]);

    console.log('Admin users created successfully!');
    await mongoose.disconnect();
}

insertAdmins().catch(console.error);
