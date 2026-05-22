import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const read = (relativePath) =>
    fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const checks = [
    {
        name: 'departments page reflects organization counts from department data',
        run() {
            const departmentsPage = read('client/src/pages/Departments.tsx');
            const departmentController = read('server/src/controllers/departmentController.ts');

            assert.match(departmentController, /sectionCount\s*=\s*await Section\.countDocuments/);
            assert.match(departmentController, /teamCount\s*=\s*await Team\.countDocuments/);
            assert.match(departmentController, /memberCount\s*=\s*await User\.countDocuments\(/);

            assert.match(departmentsPage, /getDepartmentSections\(department\._id\)/);
            assert.match(departmentsPage, /getDepartmentTeams\(department\._id\)/);
            assert.match(departmentsPage, /department\.memberCount \|\| 0/);
        },
    },
    {
        name: 'sections screen supports assigning a section to a department from a dropdown',
        run() {
            const sectionsPage = read('client/src/pages/Sections.tsx');
            const sectionService = read('client/src/services/teamService.ts');
            const sectionController = read('server/src/controllers/sectionController.ts');
            const teamsPage = read('client/src/pages/Teams.tsx');
            const teamModel = read('server/src/models/Team.ts');
            const teamController = read('server/src/controllers/teamController.ts');

            assert.match(sectionService, /async createSection\(data: \{ name: string; description\?: string; department: string \}\)/);
            assert.match(sectionController, /const \{ name, description, department \} = req\.body/);
            assert.match(sectionsPage, /label className="label">Department<\/label>/);
            assert.match(sectionsPage, /<select[\s\S]*value=\{formData\.department\}/);
            assert.match(sectionsPage, /departments\.map\(\(department\) => \(/);
            assert.match(sectionsPage, /<option key=\{department\._id\} value=\{department\._id\}>/);
            assert.match(sectionsPage, /getSectionTeams\(section\._id\)/);
            assert.match(sectionController, /Team\.find\(\{ section: section\._id,\s*deletedAt: null \}\)/);
            assert.match(sectionController, /User\.find\([\s\S]*team: \{ \$in: teamIds \}[\s\S]*\)\.distinct\('_id'\)/);
            assert.match(sectionController, /team\.members \|\| \[\]/);
            assert.match(sectionsPage, /const fallbackUserCount = sectionTeams\.reduce/);
            assert.match(sectionsPage, /const sectionUserCount = Math\.max\(section\.userCount \?\? 0, fallbackUserCount\)/);
            assert.match(teamModel, /section\?: mongoose\.Types\.ObjectId/);
            assert.match(teamController, /populate\('section', 'name department'\)/);
            assert.match(teamsPage, /label className="label">Section<\/label>/);
            assert.match(teamsPage, /value=\{formData\.section\}/);
        },
    },
    {
        name: 'user role assignment dropdown is backed by roles fetched from the API',
        run() {
            const userDetailPage = read('client/src/pages/UserDetail.tsx');
            const usersPage = read('client/src/pages/Users.tsx');
            const userModel = read('server/src/models/User.ts');
            const userController = read('server/src/controllers/userController.ts');

            assert.match(userDetailPage, /roleService\.getRoles\(\)/);
            assert.match(userDetailPage, /const assignableRoles = \(rolesRes\.data \|\| \[\]\)\.filter\(r => r\.key !== 'admin'\)/);
            assert.match(userDetailPage, /roles\.map\(\(role\) => \(/);
            assert.match(userDetailPage, /<option key=\{role\.key\} value=\{role\.key\}>/);

            assert.match(usersPage, /roleService\.getRoles\(\)/);
            assert.match(usersPage, /sectionService\.getSections\(\)/);
            assert.match(usersPage, /filters\.section/);
            assert.match(userController, /const \{ search, department, section, team, role, status/);
            assert.match(userController, /Team\.find\(\{ section \}\)\.distinct\('_id'\)/);
            assert.match(usersPage, /roles\.map\(\(role\) => \(/);
            assert.match(usersPage, /getRoleLabel\(user\.role\)/);
            assert.doesNotMatch(userModel, /enum:\s*\['member', 'team_leader', 'group_leader', 'department_manager', 'division_manager', 'admin'\]/);
            assert.match(userModel, /Role\.findOne\(\{ key: this\.role \}\)/);
            assert.match(userController, /validateSingleUserAssignments\(\{/);
            assert.match(userController, /Role\.findOne\(\{ key: resolvedAssignments\.role, isActive: true \}\)/);
        },
    },
    {
        name: 'skills and sections forms keep required dropdowns for linked data',
        run() {
            const skillsPage = read('client/src/pages/Skills.tsx');
            const sectionsPage = read('client/src/pages/Sections.tsx');

            assert.match(skillsPage, /label className="label">Category<\/label>/);
            assert.match(skillsPage, /<select[\s\S]*value=\{skillForm\.category\}[\s\S]*required/);
            assert.match(sectionsPage, /<select[\s\S]*value=\{formData\.department\}[\s\S]*required/);
        },
    },
    {
        name: 'login credential failures stay on the React login screen',
        run() {
            const loginPage = read('client/src/pages/Login.tsx');
            const registerPage = read('client/src/pages/Register.tsx');
            const layout = read('client/src/components/Layout.tsx');
            const appLogo = read('client/src/components/AppLogo.tsx');
            const apiService = read('client/src/services/api.ts');
            const authContext = read('client/src/context/AuthContext.tsx');
            const authController = read('server/src/controllers/authController.ts');

            assert.match(loginPage, /<AppLogo to="\/" \/>/);
            assert.match(registerPage, /<AppLogo to="\/" \/>/);
            assert.doesNotMatch(layout, /<AppLogo\s+to=/);
            assert.match(appLogo, /aria-label=\{label\}/);
            assert.match(appLogo, /items-baseline/);
            assert.doesNotMatch(appLogo, /label: '[169]'/);
            assert.match(loginPage, /noValidate/);
            assert.match(loginPage, /Email is required\./);
            assert.match(loginPage, /Enter a valid email address\./);
            assert.match(loginPage, /Password is required\./);
            assert.match(loginPage, /await login\(email\.trim\(\), password\)/);
            assert.match(apiService, /AUTH_UNAUTHORIZED_EVENT/);
            assert.match(apiService, /requestUrl\.endsWith\('\/auth\/login'\)/);
            assert.match(apiService, /requestUrl\.endsWith\('\/auth\/password'\)/);
            assert.doesNotMatch(apiService, /window\.location\.href\s*=\s*['"]\/login['"]/);

            assert.match(authContext, /window\.addEventListener\(AUTH_UNAUTHORIZED_EVENT,\s*handleUnauthorized\)/);
            assert.match(authContext, /navigate\('\/login',\s*\{ replace: true \}\)/);
            assert.match(authController, /const INVALID_LOGIN_MESSAGE = 'Invalid email or password\.'/);
            assert.equal((authController.match(/message: INVALID_LOGIN_MESSAGE/g) || []).length, 2);
        },
    },
];

let failed = false;

for (const check of checks) {
    try {
        check.run();
        console.log(`PASS ${check.name}`);
    } catch (error) {
        failed = true;
        console.error(`FAIL ${check.name}`);
        console.error(error instanceof Error ? error.message : error);
    }
}

if (failed) {
    process.exitCode = 1;
} else {
    console.log(`Verified ${checks.length} UI/data contract checks.`);
}
