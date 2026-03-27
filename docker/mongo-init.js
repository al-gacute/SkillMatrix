// MongoDB Initialization Script
// This script runs when the MongoDB container is first initialized

// Create application user with read/write access
db = db.getSiblingDB('skillmatrix');

db.createUser({
    user: 'skillmatrix_user',
    pwd: 'skillmatrix_password',
    roles: [
        {
            role: 'readWrite',
            db: 'skillmatrix'
        }
    ]
});

// Create indexes for better query performance

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ department: 1 });
db.users.createIndex({ team: 1 });
db.users.createIndex({ role: 1 });

// Skills collection indexes
db.skills.createIndex({ name: 1 }, { unique: true });
db.skills.createIndex({ category: 1 });
db.skills.createIndex({ isActive: 1 });

// SkillCategories collection indexes
db.skillcategories.createIndex({ name: 1 }, { unique: true });

// UserSkills collection indexes
db.userskills.createIndex({ user: 1 });
db.userskills.createIndex({ skill: 1 });
db.userskills.createIndex({ user: 1, skill: 1 }, { unique: true });
db.userskills.createIndex({ proficiencyLevel: 1 });

// Endorsements collection indexes
db.endorsements.createIndex({ userSkill: 1 });
db.endorsements.createIndex({ endorser: 1 });
db.endorsements.createIndex({ endorsee: 1 });
db.endorsements.createIndex({ endorser: 1, userSkill: 1 }, { unique: true });

// Teams collection indexes
db.teams.createIndex({ name: 1 });
db.teams.createIndex({ department: 1 });
db.teams.createIndex({ lead: 1 });

// Departments collection indexes
db.departments.createIndex({ name: 1 }, { unique: true });
db.departments.createIndex({ manager: 1 });

// Insert default skill categories
db.skillcategories.insertMany([
    {
        name: 'Frontend',
        description: 'Frontend development technologies',
        color: '#3B82F6',
        icon: 'CodeBracketIcon',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'Backend',
        description: 'Backend development technologies',
        color: '#10B981',
        icon: 'ServerIcon',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'Database',
        description: 'Database technologies',
        color: '#F59E0B',
        icon: 'CircleStackIcon',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'DevOps',
        description: 'DevOps and infrastructure',
        color: '#EF4444',
        icon: 'CloudIcon',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'Cloud',
        description: 'Cloud platforms and services',
        color: '#8B5CF6',
        icon: 'CloudArrowUpIcon',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'Soft Skills',
        description: 'Soft skills and leadership',
        color: '#EC4899',
        icon: 'UserGroupIcon',
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);

// Insert default admin users
// Password for admin@skillmatrix.com: Admin@123
// Password for superadmin@skillmatrix.com: Super@123
db.users.insertMany([
    {
        email: 'admin@skillmatrix.com',
        password: '$2a$10$BMIiOygQp.rXcrieM6Q5juA62nMgEjF8vqCwIFwn4VJgXGrIhCLnS',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        roleLevel: 6,
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: 'superadmin@skillmatrix.com',
        password: '$2a$10$GWDbi69dJaMFjk.vdawm3OAErxUHrD2V6ZHX6O8fl4tGedtEkAf76',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'admin',
        roleLevel: 6,
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);

print('Database initialization completed successfully!');
