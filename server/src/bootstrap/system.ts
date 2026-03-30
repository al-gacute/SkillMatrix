import { Role, User } from '../models';
import { config } from '../config';

const defaultRoles = [
    {
        name: 'Member',
        key: 'member',
        level: 1,
        organizationScopes: [],
        description: 'Regular team member (default for all users)',
        isSystem: true,
        isActive: true,
    },
    {
        name: 'Team Leader',
        key: 'team_leader',
        level: 2,
        organizationScopes: ['team'],
        description: 'Leads a team',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Group Leader',
        key: 'group_leader',
        level: 3,
        organizationScopes: ['section'],
        description: 'Leads multiple teams',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Department Manager',
        key: 'department_manager',
        level: 4,
        organizationScopes: ['department'],
        description: 'Manages a department',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Division Manager',
        key: 'division_manager',
        level: 5,
        organizationScopes: [],
        description: 'Manages a division',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Admin',
        key: 'admin',
        level: 100,
        organizationScopes: [],
        description: 'System administrator',
        isSystem: true,
        isActive: true,
    },
];

const ensureDefaultRoles = async (): Promise<number> => {
    let createdCount = 0;

    for (const roleData of defaultRoles) {
        const existingRole = await Role.findOne({ key: roleData.key }).lean();

        if (existingRole) {
            continue;
        }

        await Role.create({
            ...roleData,
            deletedAt: null,
        });
        createdCount += 1;
    }

    return createdCount;
};

const ensureDefaultAdminUsers = async (): Promise<number> => {
    let createdCount = 0;
    const adminRole = await Role.findOne({ key: 'admin' }).lean();
    const adminRoleLevel = adminRole?.level || 100;

    for (const account of config.defaultAdminAccounts) {
        const existingUser = await User.findOne({ email: account.email.toLowerCase() });

        if (existingUser) {
            continue;
        }

        const user = new User({
            email: account.email.toLowerCase(),
            password: account.password,
            firstName: account.firstName,
            lastName: account.lastName,
            role: 'admin',
            roleLevel: adminRoleLevel,
            avatar: '',
            isApproved: true,
            isActive: true,
            deletedAt: null,
        });

        user.createdBy = user._id;
        user.updatedBy = user._id;

        await user.save();
        createdCount += 1;
    }

    return createdCount;
};

export const bootstrapSystemData = async (): Promise<void> => {
    const rolesCreated = await ensureDefaultRoles();
    const adminUsersCreated = await ensureDefaultAdminUsers();

    if (rolesCreated > 0 || adminUsersCreated > 0) {
        console.log(
            `System bootstrap completed: created ${rolesCreated} role(s) and ${adminUsersCreated} default admin account(s).`
        );
        return;
    }

    console.log('System bootstrap completed: no missing default roles or admin accounts were found.');
};
