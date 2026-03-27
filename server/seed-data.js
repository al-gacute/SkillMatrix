const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skillmatrix');

const departmentSchema = new mongoose.Schema({
    name: String,
    description: String,
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const sectionSchema = new mongoose.Schema({
    name: String,
    description: String,
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
}, { timestamps: true });

const teamSchema = new mongoose.Schema({
    name: String,
    description: String,
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    role: String,
    roleLevel: Number,
    projectPosition: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectPosition' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    title: String,
    bio: String,
    hireDate: Date,
    isApproved: Boolean,
    isActive: Boolean,
    deactivatedAt: Date,
}, { timestamps: true });

const skillCategorySchema = new mongoose.Schema({
    name: String,
    description: String,
    color: String,
    icon: String,
}, { timestamps: true });

const skillSchema = new mongoose.Schema({
    name: String,
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillCategory' },
}, { timestamps: true });

const userSkillSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    proficiencyLevel: Number,
    yearsOfExperience: Number,
    notes: String,
    isPublic: Boolean,
    endorsements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    endorsementCount: Number,
}, { timestamps: true });

const endorsementSchema = new mongoose.Schema({
    endorser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    endorsee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSkill' },
    skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    comment: String,
}, { timestamps: true });

const assessmentSchema = new mongoose.Schema({
    assessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assessee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    period: String,
    type: String,
    status: String,
    skillRatings: [{
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
        rating: Number,
        comments: String,
    }],
    performanceRating: Number,
    strengths: [String],
    areasForImprovement: [String],
    goals: [{
        description: String,
        targetDate: Date,
        status: String,
    }],
    overallComments: String,
    assesseeAcknowledged: Boolean,
    assesseeComments: String,
    acknowledgedAt: Date,
    submittedAt: Date,
    reviewedAt: Date,
    completedAt: Date,
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
    giver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: String,
    visibility: String,
    title: String,
    content: String,
    period: String,
    reviewType: String,
    strengths: [String],
    areasForImprovement: [String],
    overallComments: String,
    relatedSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    relatedProject: String,
    rating: Number,
    isReviewed: Boolean,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    managerNotes: String,
    isAcknowledged: Boolean,
    acknowledgedAt: Date,
    receiverResponse: String,
}, { timestamps: true });

const projectPositionSchema = new mongoose.Schema({
    name: String,
    description: String,
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);
const Section = mongoose.model('Section', sectionSchema);
const Team = mongoose.model('Team', teamSchema);
const User = mongoose.model('User', userSchema);
const ProjectPosition = mongoose.model('ProjectPosition', projectPositionSchema);
const SkillCategory = mongoose.model('SkillCategory', skillCategorySchema);
const Skill = mongoose.model('Skill', skillSchema);
const UserSkill = mongoose.model('UserSkill', userSkillSchema);
const Endorsement = mongoose.model('Endorsement', endorsementSchema);
const Assessment = mongoose.model('Assessment', assessmentSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

const dayOffset = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
};

const FEEDBACK_TYPE_LABELS = {
    praise: 'Praise',
    constructive: 'Constructive Feedback',
    suggestion: 'Suggestion',
    recognition: 'Recognition',
};

async function seedDatabase() {
    console.log('Starting enriched database seed...');

    await Endorsement.deleteMany({});
    await Feedback.deleteMany({});
    await Assessment.deleteMany({});
    await UserSkill.deleteMany({});
    await Skill.deleteMany({});
    await SkillCategory.deleteMany({});
    await ProjectPosition.deleteMany({});
    await Team.deleteMany({});
    await Section.deleteMany({});
    await Department.deleteMany({});
    await User.deleteMany({ role: { $ne: 'admin' } });

    const password = await bcrypt.hash('Password123', 10);

    console.log('Creating departments...');
    const departments = await Department.insertMany([
        { name: 'Engineering', description: 'Product engineering, delivery, and architecture' },
        { name: 'Product', description: 'Product strategy, research, and roadmap execution' },
        { name: 'Design', description: 'Experience design, brand systems, and research' },
        { name: 'Quality Assurance', description: 'Quality engineering and release validation' },
        { name: 'DevOps', description: 'Cloud platform, reliability, and delivery automation' },
    ]);

    const departmentMap = Object.fromEntries(departments.map((department) => [department.name, department]));

    console.log('Creating sections...');
    const sections = await Section.insertMany([
        { name: 'Web Platforms', description: 'Customer-facing web applications', department: departmentMap.Engineering._id },
        { name: 'Core Services', description: 'Platform APIs and domain services', department: departmentMap.Engineering._id },
        { name: 'Mobile Experience', description: 'Native and cross-platform mobile delivery', department: departmentMap.Engineering._id },
        { name: 'Product Strategy', description: 'Planning and portfolio management', department: departmentMap.Product._id },
        { name: 'Growth & Insights', description: 'Experimentation, analytics, and monetization', department: departmentMap.Product._id },
        { name: 'Experience Design', description: 'UX, discovery, and flows', department: departmentMap.Design._id },
        { name: 'Design Systems', description: 'Reusable visual and interaction standards', department: departmentMap.Design._id },
        { name: 'Test Engineering', description: 'Automation and platform quality', department: departmentMap['Quality Assurance']._id },
        { name: 'Release Operations', description: 'Manual validation and release readiness', department: departmentMap['Quality Assurance']._id },
        { name: 'Cloud Platform', description: 'Infrastructure, tooling, and security hardening', department: departmentMap.DevOps._id },
    ]);

    const sectionMap = Object.fromEntries(sections.map((section) => [section.name, section]));

    console.log('Creating teams...');
    const teams = await Team.insertMany([
        { name: 'Frontend Team', description: 'React applications and shared web UI', department: departmentMap.Engineering._id, section: sectionMap['Web Platforms']._id },
        { name: 'Backend Team', description: 'APIs, integrations, and backend services', department: departmentMap.Engineering._id, section: sectionMap['Core Services']._id },
        { name: 'Mobile Team', description: 'iOS, Android, and mobile platform work', department: departmentMap.Engineering._id, section: sectionMap['Mobile Experience']._id },
        { name: 'Platform Team', description: 'Developer productivity and runtime foundations', department: departmentMap.Engineering._id },
        { name: 'Core Product Team', description: 'Product planning for flagship features', department: departmentMap.Product._id, section: sectionMap['Product Strategy']._id },
        { name: 'Growth Product Team', description: 'Retention, funnel optimization, and experimentation', department: departmentMap.Product._id, section: sectionMap['Growth & Insights']._id },
        { name: 'UX Research Team', description: 'Research, usability testing, and journey mapping', department: departmentMap.Design._id, section: sectionMap['Experience Design']._id },
        { name: 'UI Systems Team', description: 'Design system governance and visual standards', department: departmentMap.Design._id, section: sectionMap['Design Systems']._id },
        { name: 'Automation Team', description: 'Test automation and quality tooling', department: departmentMap['Quality Assurance']._id, section: sectionMap['Test Engineering']._id },
        { name: 'Manual QA Team', description: 'Release validation and exploratory testing', department: departmentMap['Quality Assurance']._id, section: sectionMap['Release Operations']._id },
        { name: 'Infrastructure Team', description: 'Cloud operations and environment management', department: departmentMap.DevOps._id, section: sectionMap['Cloud Platform']._id },
        { name: 'SRE Team', description: 'Reliability engineering and production resilience', department: departmentMap.DevOps._id, section: sectionMap['Cloud Platform']._id },
    ]);

    const teamMap = Object.fromEntries(teams.map((team) => [team.name, team]));

    const roleLevel = {
        member: 1,
        team_leader: 2,
        group_leader: 3,
        department_manager: 4,
        division_manager: 5,
        admin: 6,
    };

    const makeUser = (firstName, lastName, email, role, title, departmentName, teamName, daysAgo, isApproved = true, isActive = true) => ({
        firstName,
        lastName,
        email,
        password,
        role,
        roleLevel: roleLevel[role] || 1,
        title,
        department: departmentName ? departmentMap[departmentName]._id : undefined,
        team: teamName ? teamMap[teamName]._id : undefined,
        hireDate: dayOffset(300 + daysAgo),
        bio: `${title} in ${departmentName || 'Operations'}`,
        isApproved,
        isActive,
        createdAt: dayOffset(daysAgo),
        updatedAt: dayOffset(Math.max(daysAgo - 2, 0)),
    });

    console.log('Creating users...');
    const users = await User.insertMany([
        makeUser('John', 'Doe', 'john.doe@company.com', 'team_leader', 'Frontend Lead', 'Engineering', 'Frontend Team', 28),
        makeUser('Jane', 'Smith', 'jane.smith@company.com', 'member', 'Senior Frontend Engineer', 'Engineering', 'Frontend Team', 26),
        makeUser('Mike', 'Wilson', 'mike.wilson@company.com', 'member', 'Frontend Engineer', 'Engineering', 'Frontend Team', 24),
        makeUser('Priya', 'Nair', 'priya.nair@company.com', 'member', 'UI Engineer', 'Engineering', 'Frontend Team', 22),

        makeUser('Sarah', 'Brown', 'sarah.brown@company.com', 'team_leader', 'Backend Lead', 'Engineering', 'Backend Team', 27),
        makeUser('David', 'Lee', 'david.lee@company.com', 'member', 'Backend Engineer', 'Engineering', 'Backend Team', 21),
        makeUser('Emily', 'Chen', 'emily.chen@company.com', 'member', 'API Engineer', 'Engineering', 'Backend Team', 18),
        makeUser('Noah', 'Patel', 'noah.patel@company.com', 'member', 'Integration Engineer', 'Engineering', 'Backend Team', 15),

        makeUser('Alex', 'Garcia', 'alex.garcia@company.com', 'team_leader', 'Mobile Lead', 'Engineering', 'Mobile Team', 25),
        makeUser('Lisa', 'Martinez', 'lisa.martinez@company.com', 'member', 'iOS Engineer', 'Engineering', 'Mobile Team', 19),
        makeUser('Ethan', 'Brooks', 'ethan.brooks@company.com', 'member', 'Android Engineer', 'Engineering', 'Mobile Team', 17),

        makeUser('Ava', 'Nguyen', 'ava.nguyen@company.com', 'team_leader', 'Platform Lead', 'Engineering', 'Platform Team', 23),
        makeUser('Robert', 'Taylor', 'robert.taylor@company.com', 'department_manager', 'Engineering Manager', 'Engineering', '', 30),
        makeUser('Ivy', 'Walker', 'ivy.walker@company.com', 'member', 'Architecture Analyst', 'Engineering', '', 12),

        makeUser('Amanda', 'White', 'amanda.white@company.com', 'team_leader', 'Product Lead', 'Product', 'Core Product Team', 29),
        makeUser('Chris', 'Johnson', 'chris.johnson@company.com', 'member', 'Product Manager', 'Product', 'Core Product Team', 20),
        makeUser('Rachel', 'Adams', 'rachel.adams@company.com', 'team_leader', 'Growth PM Lead', 'Product', 'Growth Product Team', 16),
        makeUser('Liam', 'Cooper', 'liam.cooper@company.com', 'member', 'Growth Analyst', 'Product', 'Growth Product Team', 13),
        makeUser('Mia', 'Turner', 'mia.turner@company.com', 'department_manager', 'Director of Product', 'Product', '', 31),

        makeUser('Kevin', 'Moore', 'kevin.moore@company.com', 'team_leader', 'UX Research Lead', 'Design', 'UX Research Team', 18),
        makeUser('Sophia', 'Clark', 'sophia.clark@company.com', 'member', 'UX Designer', 'Design', 'UX Research Team', 14),
        makeUser('Daniel', 'Wright', 'daniel.wright@company.com', 'team_leader', 'Design Systems Lead', 'Design', 'UI Systems Team', 11),
        makeUser('Olive', 'Reed', 'olive.reed@company.com', 'member', 'Visual Designer', 'Design', 'UI Systems Team', 9),
        makeUser('Ella', 'Price', 'ella.price@company.com', 'department_manager', 'Head of Design', 'Design', '', 33),

        makeUser('Olivia', 'Hall', 'olivia.hall@company.com', 'team_leader', 'QA Automation Lead', 'Quality Assurance', 'Automation Team', 20),
        makeUser('James', 'King', 'james.king@company.com', 'member', 'QA Automation Engineer', 'Quality Assurance', 'Automation Team', 17),
        makeUser('Emma', 'Scott', 'emma.scott@company.com', 'team_leader', 'Release QA Lead', 'Quality Assurance', 'Manual QA Team', 15),
        makeUser('Lucas', 'Foster', 'lucas.foster@company.com', 'member', 'QA Analyst', 'Quality Assurance', 'Manual QA Team', 10),
        makeUser('Grace', 'Bennett', 'grace.bennett@company.com', 'department_manager', 'Quality Manager', 'Quality Assurance', '', 34),

        makeUser('Ryan', 'Hill', 'ryan.hill@company.com', 'team_leader', 'Infrastructure Lead', 'DevOps', 'Infrastructure Team', 18),
        makeUser('Natalie', 'Green', 'natalie.green@company.com', 'member', 'Cloud Engineer', 'DevOps', 'Infrastructure Team', 12),
        makeUser('Henry', 'Ward', 'henry.ward@company.com', 'team_leader', 'SRE Lead', 'DevOps', 'SRE Team', 14),
        makeUser('Zoe', 'Rivera', 'zoe.rivera@company.com', 'member', 'Site Reliability Engineer', 'DevOps', 'SRE Team', 8),
        makeUser('Mason', 'Bell', 'mason.bell@company.com', 'department_manager', 'Director of Platform', 'DevOps', '', 36),
    ]);

    const userMap = Object.fromEntries(users.map((user) => [`${user.firstName} ${user.lastName}`, user]));

    console.log('Creating company positions from user titles...');
    const uniqueTitles = [...new Set(users.map((user) => user.title).filter(Boolean))].sort();
    const projectPositions = await ProjectPosition.insertMany(
        uniqueTitles.map((title) => ({
            name: title,
            description: `Company position seeded from mock user title: ${title}`,
        }))
    );
    const projectPositionMap = Object.fromEntries(projectPositions.map((position) => [position.name, position]));

    for (const user of users) {
        if (!user.title) continue;
        await User.findByIdAndUpdate(user._id, {
            projectPosition: projectPositionMap[user.title]?._id,
        });
    }

    console.log('Assigning department managers and team leads...');
    await Department.findByIdAndUpdate(departmentMap.Engineering._id, { manager: userMap['Robert Taylor']._id });
    await Department.findByIdAndUpdate(departmentMap.Product._id, { manager: userMap['Mia Turner']._id });
    await Department.findByIdAndUpdate(departmentMap.Design._id, { manager: userMap['Ella Price']._id });
    await Department.findByIdAndUpdate(departmentMap['Quality Assurance']._id, { manager: userMap['Grace Bennett']._id });
    await Department.findByIdAndUpdate(departmentMap.DevOps._id, { manager: userMap['Mason Bell']._id });

    const teamLeadAssignments = {
        'Frontend Team': 'John Doe',
        'Backend Team': 'Sarah Brown',
        'Mobile Team': 'Alex Garcia',
        'Platform Team': 'Ava Nguyen',
        'Core Product Team': 'Amanda White',
        'Growth Product Team': 'Rachel Adams',
        'UX Research Team': 'Kevin Moore',
        'UI Systems Team': 'Daniel Wright',
        'Automation Team': 'Olivia Hall',
        'Manual QA Team': 'Emma Scott',
        'Infrastructure Team': 'Ryan Hill',
        'SRE Team': 'Henry Ward',
    };

    for (const [teamName, leadName] of Object.entries(teamLeadAssignments)) {
        await Team.findByIdAndUpdate(teamMap[teamName]._id, { lead: userMap[leadName]._id });
    }

    console.log('Syncing team members...');
    for (const team of teams) {
        const members = users.filter((user) => String(user.team) === String(team._id)).map((user) => user._id);
        await Team.findByIdAndUpdate(team._id, { members });
    }

    console.log('Creating skill catalog...');
    const categories = await SkillCategory.insertMany([
        { name: 'Frontend', description: 'UI engineering and frontend frameworks', color: '#2563EB', icon: 'code' },
        { name: 'Backend', description: 'APIs, services, and backend engineering', color: '#059669', icon: 'server' },
        { name: 'Mobile', description: 'Native and hybrid mobile engineering', color: '#7C3AED', icon: 'device-phone-mobile' },
        { name: 'Product', description: 'Product strategy and analytics', color: '#F59E0B', icon: 'chart-bar' },
        { name: 'Design', description: 'UX, visual systems, and research', color: '#EC4899', icon: 'sparkles' },
        { name: 'Quality', description: 'Testing, quality engineering, and release confidence', color: '#DC2626', icon: 'shield-check' },
        { name: 'Cloud', description: 'Infrastructure, CI/CD, and platform operations', color: '#06B6D4', icon: 'cloud' },
        { name: 'Leadership', description: 'Leadership, communication, and execution', color: '#0F766E', icon: 'users' },
    ]);

    const categoryMap = Object.fromEntries(categories.map((category) => [category.name, category]));

    const skills = await Skill.insertMany([
        { name: 'React', description: 'Building modern React interfaces', category: categoryMap.Frontend._id },
        { name: 'TypeScript', description: 'Typed application development', category: categoryMap.Frontend._id },
        { name: 'Tailwind CSS', description: 'Utility-first CSS workflows', category: categoryMap.Frontend._id },
        { name: 'Node.js', description: 'Server-side JavaScript services', category: categoryMap.Backend._id },
        { name: 'REST APIs', description: 'HTTP API design and implementation', category: categoryMap.Backend._id },
        { name: 'MongoDB', description: 'Document modeling and query design', category: categoryMap.Backend._id },
        { name: 'Swift', description: 'Native iOS development', category: categoryMap.Mobile._id },
        { name: 'Kotlin', description: 'Native Android development', category: categoryMap.Mobile._id },
        { name: 'Roadmapping', description: 'Product planning and prioritization', category: categoryMap.Product._id },
        { name: 'Experimentation', description: 'A/B testing and funnel analysis', category: categoryMap.Product._id },
        { name: 'User Research', description: 'Discovery, interviews, and synthesis', category: categoryMap.Design._id },
        { name: 'Design Systems', description: 'Reusable design patterns and governance', category: categoryMap.Design._id },
        { name: 'Test Automation', description: 'Automated quality strategies', category: categoryMap.Quality._id },
        { name: 'Release Validation', description: 'Manual and exploratory test practices', category: categoryMap.Quality._id },
        { name: 'Docker', description: 'Container-based development and delivery', category: categoryMap.Cloud._id },
        { name: 'Kubernetes', description: 'Container orchestration and scaling', category: categoryMap.Cloud._id },
        { name: 'AWS', description: 'Cloud platform architecture and services', category: categoryMap.Cloud._id },
        { name: 'Communication', description: 'Clear written and verbal communication', category: categoryMap.Leadership._id },
        { name: 'Leadership', description: 'Team leadership and mentoring', category: categoryMap.Leadership._id },
        { name: 'Agile Delivery', description: 'Agile planning and execution', category: categoryMap.Leadership._id },
    ]);

    const skillMap = Object.fromEntries(skills.map((skill) => [skill.name, skill]));

    const userSkills = [];
    const pushSkill = (userName, skillName, proficiencyLevel, yearsOfExperience, daysAgo, notes = '') => {
        userSkills.push({
            user: userMap[userName]._id,
            skill: skillMap[skillName]._id,
            proficiencyLevel,
            yearsOfExperience,
            notes,
            isPublic: true,
            endorsements: [],
            endorsementCount: 0,
            createdAt: dayOffset(daysAgo),
            updatedAt: dayOffset(Math.max(daysAgo - 1, 0)),
        });
    };

    const addBundle = (userName, entries, startDay) => {
        entries.forEach(([skillName, level, years], index) => {
            pushSkill(userName, skillName, level, years, Math.max(startDay - index, 1));
        });
    };

    addBundle('John Doe', [['React', 8, 8], ['TypeScript', 8, 7], ['Tailwind CSS', 7, 6], ['Communication', 6, 8], ['Leadership', 6, 4]], 28);
    addBundle('Jane Smith', [['React', 7, 6], ['TypeScript', 7, 5], ['Tailwind CSS', 6, 5], ['Communication', 5, 6]], 25);
    addBundle('Mike Wilson', [['React', 5, 3], ['TypeScript', 5, 3], ['Tailwind CSS', 5, 2], ['Agile Delivery', 4, 2]], 21);
    addBundle('Priya Nair', [['React', 6, 4], ['TypeScript', 6, 4], ['Tailwind CSS', 6, 3], ['Communication', 5, 4]], 18);

    addBundle('Sarah Brown', [['Node.js', 8, 9], ['REST APIs', 8, 8], ['MongoDB', 7, 7], ['Leadership', 6, 4]], 27);
    addBundle('David Lee', [['Node.js', 6, 5], ['REST APIs', 6, 5], ['MongoDB', 5, 4], ['Communication', 5, 5]], 20);
    addBundle('Emily Chen', [['Node.js', 6, 4], ['REST APIs', 7, 5], ['MongoDB', 6, 4], ['Agile Delivery', 5, 4]], 16);
    addBundle('Noah Patel', [['Node.js', 5, 3], ['REST APIs', 5, 3], ['MongoDB', 4, 2], ['Communication', 4, 3]], 13);

    addBundle('Alex Garcia', [['Swift', 7, 7], ['Kotlin', 6, 5], ['REST APIs', 5, 5], ['Leadership', 6, 4]], 24);
    addBundle('Lisa Martinez', [['Swift', 6, 5], ['Kotlin', 4, 2], ['Communication', 5, 4]], 18);
    addBundle('Ethan Brooks', [['Kotlin', 6, 4], ['Swift', 4, 2], ['Agile Delivery', 4, 3]], 14);

    addBundle('Ava Nguyen', [['Node.js', 6, 6], ['Docker', 7, 6], ['Kubernetes', 6, 5], ['Leadership', 6, 4]], 23);
    addBundle('Robert Taylor', [['Leadership', 8, 10], ['Communication', 8, 10], ['Agile Delivery', 7, 9]], 30);
    addBundle('Ivy Walker', [['Node.js', 4, 2], ['Communication', 5, 4], ['Agile Delivery', 5, 3]], 11);

    addBundle('Amanda White', [['Roadmapping', 8, 8], ['Experimentation', 6, 5], ['Leadership', 6, 4], ['Communication', 7, 7]], 28);
    addBundle('Chris Johnson', [['Roadmapping', 6, 4], ['Experimentation', 5, 3], ['Communication', 5, 4]], 19);
    addBundle('Rachel Adams', [['Roadmapping', 7, 6], ['Experimentation', 8, 6], ['Leadership', 6, 4]], 16);
    addBundle('Liam Cooper', [['Experimentation', 6, 4], ['Roadmapping', 5, 3], ['Communication', 5, 4]], 12);
    addBundle('Mia Turner', [['Roadmapping', 8, 10], ['Leadership', 8, 9], ['Communication', 8, 9]], 31);

    addBundle('Kevin Moore', [['User Research', 8, 8], ['Communication', 7, 7], ['Leadership', 6, 4]], 18);
    addBundle('Sophia Clark', [['User Research', 6, 4], ['Design Systems', 5, 3], ['Communication', 5, 4]], 14);
    addBundle('Daniel Wright', [['Design Systems', 8, 7], ['User Research', 5, 4], ['Leadership', 6, 4]], 11);
    addBundle('Olive Reed', [['Design Systems', 6, 4], ['Communication', 5, 3]], 9);
    addBundle('Ella Price', [['Leadership', 8, 10], ['Communication', 8, 9], ['Design Systems', 7, 8]], 29);

    addBundle('Olivia Hall', [['Test Automation', 8, 8], ['Release Validation', 6, 5], ['Leadership', 6, 4]], 20);
    addBundle('James King', [['Test Automation', 6, 4], ['Release Validation', 5, 3], ['Communication', 5, 4]], 16);
    addBundle('Emma Scott', [['Release Validation', 8, 8], ['Test Automation', 5, 3], ['Leadership', 6, 4]], 15);
    addBundle('Lucas Foster', [['Release Validation', 6, 4], ['Communication', 5, 4]], 10);
    addBundle('Grace Bennett', [['Leadership', 8, 9], ['Communication', 8, 9], ['Release Validation', 6, 7]], 32);

    addBundle('Ryan Hill', [['Docker', 8, 8], ['Kubernetes', 8, 7], ['AWS', 8, 8], ['Leadership', 6, 4]], 18);
    addBundle('Natalie Green', [['Docker', 6, 4], ['Kubernetes', 5, 3], ['AWS', 6, 4]], 12);
    addBundle('Henry Ward', [['Docker', 7, 6], ['Kubernetes', 8, 7], ['AWS', 7, 6], ['Leadership', 6, 4]], 14);
    addBundle('Zoe Rivera', [['Docker', 5, 3], ['AWS', 6, 4], ['Communication', 5, 4]], 8);
    addBundle('Mason Bell', [['Leadership', 8, 10], ['Communication', 8, 10], ['AWS', 7, 8]], 34);

    console.log('Creating user skills...');
    const insertedUserSkills = await UserSkill.insertMany(userSkills);

    const userSkillMap = new Map(insertedUserSkills.map((userSkill) => {
        const user = users.find((candidate) => String(candidate._id) === String(userSkill.user));
        const skill = skills.find((candidate) => String(candidate._id) === String(userSkill.skill));
        return [`${user.firstName} ${user.lastName}:${skill.name}`, userSkill];
    }));

    const endorsements = [];
    const addEndorsement = (endorserName, endorseeName, skillName, daysAgo, comment) => {
        const userSkill = userSkillMap.get(`${endorseeName}:${skillName}`);
        if (!userSkill) {
            return;
        }

        endorsements.push({
            endorser: userMap[endorserName]._id,
            endorsee: userMap[endorseeName]._id,
            userSkill: userSkill._id,
            skill: userSkill.skill,
            comment,
            createdAt: dayOffset(daysAgo),
            updatedAt: dayOffset(daysAgo),
        });
    };

    addEndorsement('Jane Smith', 'John Doe', 'React', 24, 'Consistently raises the frontend quality bar.');
    addEndorsement('Sarah Brown', 'John Doe', 'TypeScript', 23, 'Strong typing discipline across projects.');
    addEndorsement('Priya Nair', 'Jane Smith', 'React', 20, 'Great support on shared UI patterns.');
    addEndorsement('John Doe', 'Sarah Brown', 'REST APIs', 19, 'Reliable API collaboration and contract clarity.');
    addEndorsement('David Lee', 'Sarah Brown', 'Node.js', 18, 'Mentors the backend team effectively.');
    addEndorsement('Emily Chen', 'David Lee', 'REST APIs', 17, 'Clean API thinking and documentation.');
    addEndorsement('Alex Garcia', 'Lisa Martinez', 'Swift', 16, 'Strong ownership on the iOS flows.');
    addEndorsement('Amanda White', 'Rachel Adams', 'Experimentation', 15, 'Sharp hypothesis and testing design.');
    addEndorsement('Mia Turner', 'Amanda White', 'Roadmapping', 14, 'Keeps roadmap tradeoffs clear.');
    addEndorsement('Kevin Moore', 'Daniel Wright', 'Design Systems', 13, 'Great stewardship of reusable patterns.');
    addEndorsement('Sophia Clark', 'Kevin Moore', 'User Research', 12, 'Insightful synthesis and facilitation.');
    addEndorsement('Olivia Hall', 'James King', 'Test Automation', 11, 'Improved regression confidence noticeably.');
    addEndorsement('Emma Scott', 'Lucas Foster', 'Release Validation', 10, 'Very dependable release coverage.');
    addEndorsement('Ryan Hill', 'Henry Ward', 'Kubernetes', 9, 'Strong production readiness thinking.');
    addEndorsement('Natalie Green', 'Ryan Hill', 'AWS', 8, 'Excellent platform guidance.');
    addEndorsement('Robert Taylor', 'Mia Turner', 'Leadership', 7, 'Drives alignment under pressure.');
    addEndorsement('Mason Bell', 'Robert Taylor', 'Communication', 6, 'Clear, steady leadership communication.');
    addEndorsement('Ella Price', 'Kevin Moore', 'Communication', 5, 'Brings research insights to life.');
    addEndorsement('Grace Bennett', 'Olivia Hall', 'Leadership', 4, 'Sets a high bar for delivery discipline.');
    addEndorsement('Henry Ward', 'Ryan Hill', 'Docker', 3, 'Strong platform enablement and troubleshooting.');

    console.log('Creating endorsements...');
    const insertedEndorsements = await Endorsement.insertMany(endorsements);

    const endorsementsByUserSkill = new Map();
    for (const endorsement of insertedEndorsements) {
        const key = String(endorsement.userSkill);
        const current = endorsementsByUserSkill.get(key) || [];
        current.push(endorsement.endorser);
        endorsementsByUserSkill.set(key, current);
    }

    for (const userSkill of insertedUserSkills) {
        const endorsers = endorsementsByUserSkill.get(String(userSkill._id)) || [];
        await UserSkill.findByIdAndUpdate(userSkill._id, {
            endorsements: endorsers,
            endorsementCount: endorsers.length,
        });
    }

    const assessmentStrengthsPool = [
        'Analytical thinking',
        'Communication (written)',
        'Problem solving',
        'Collaboration',
        'Leadership',
        'Technical proficiency',
        'Ownership',
        'User-centric thinking',
    ];
    const assessmentImprovementPool = [
        'Strengthening task prioritization',
        'Enhancing clarity in communication',
        'Developing leadership confidence',
        'Increasing attention to quality',
        'Strengthening value prioritization',
        'Improving debugging and troubleshooting',
        'Building resilience under pressure',
        'Sharing knowledge more actively',
    ];
    const feedbackStrengthsPool = [
        'Analytical thinking',
        'Collaboration',
        'Communication (verbal)',
        'Ownership',
        'Technical proficiency',
        'Leadership',
        'Attention to quality',
        'User-centric thinking',
    ];
    const feedbackImprovementPool = [
        'Improving time management skills',
        'Strengthening active listening skills',
        'Enhancing consistency in delivery',
        'Improving requirement analysis',
        'Building automation mindset',
        'Increasing initiative in learning',
        'Developing long-term strategic thinking',
        'Improving written communication and documentation',
    ];

    const departmentManagerByDepartment = {
        Engineering: 'Robert Taylor',
        Product: 'Mia Turner',
        Design: 'Ella Price',
        'Quality Assurance': 'Grace Bennett',
        DevOps: 'Mason Bell',
    };

    const departmentManagerNames = Object.values(departmentManagerByDepartment);

    const getUserName = (user) => `${user.firstName} ${user.lastName}`;
    const getDepartmentName = (user) => {
        const department = departments.find((candidate) => String(candidate._id) === String(user.department));
        return department?.name || '';
    };
    const getAssessmentAssessorName = (user) => {
        if (user.role === 'member') {
            const teamEntry = Object.entries(teamLeadAssignments).find(([teamName]) => String(teamMap[teamName]._id) === String(user.team));
            return teamEntry?.[1] || departmentManagerByDepartment[getDepartmentName(user)] || 'Robert Taylor';
        }

        if (user.role === 'team_leader') {
            return departmentManagerByDepartment[getDepartmentName(user)] || 'Robert Taylor';
        }

        if (user.role === 'department_manager') {
            const currentName = getUserName(user);
            return departmentManagerNames.find((name) => name !== currentName) || 'Robert Taylor';
        }

        return departmentManagerByDepartment[getDepartmentName(user)] || 'Robert Taylor';
    };
    const getFeedbackGiverName = (user, index) => {
        if (user.role === 'member') {
            const teamMemberNames = users
                .filter((candidate) => String(candidate.team) === String(user.team) && String(candidate._id) !== String(user._id))
                .map(getUserName);
            return teamMemberNames[index % teamMemberNames.length] || getAssessmentAssessorName(user);
        }

        if (user.role === 'team_leader') {
            const departmentName = getDepartmentName(user);
            const managerName = departmentManagerByDepartment[departmentName];
            return managerName && managerName !== getUserName(user) ? managerName : 'Robert Taylor';
        }

        if (user.role === 'department_manager') {
            const currentName = getUserName(user);
            return departmentManagerNames.find((name) => name !== currentName) || 'Mia Turner';
        }

        return getAssessmentAssessorName(user);
    };

    const userSkillsByUser = new Map();
    for (const userSkill of insertedUserSkills) {
        const key = String(userSkill.user);
        const current = userSkillsByUser.get(key) || [];
        current.push(userSkill);
        userSkillsByUser.set(key, current);
    }

    const assessments = [];
    const feedbackEntries = [];
    const assessmentStatuses = ['submitted', 'reviewed', 'completed'];
    const feedbackTypes = ['praise', 'constructive', 'suggestion', 'recognition'];

    users.forEach((user, index) => {
        const assesseeSkills = (userSkillsByUser.get(String(user._id)) || []).slice(0, 3);
        const averageRatingBase = assesseeSkills.length > 0
            ? Math.round(assesseeSkills.reduce((sum, entry) => sum + (entry.proficiencyLevel || 5), 0) / assesseeSkills.length)
            : 5;
        const assessmentAssessorName = getAssessmentAssessorName(user);
        const assessmentAssessor = userMap[assessmentAssessorName];
        const feedbackGiverName = getFeedbackGiverName(user, index);
        const feedbackGiver = userMap[feedbackGiverName];
        const createdDaysAgo = 45 - (index % 18);
        const submittedAt = dayOffset(Math.max(createdDaysAgo - 1, 1));
        const reviewedAt = dayOffset(Math.max(createdDaysAgo - 2, 1));
        const acknowledgedAt = dayOffset(Math.max(createdDaysAgo - 3, 1));
        const assessmentStatus = assessmentStatuses[index % assessmentStatuses.length];
        const feedbackType = feedbackTypes[index % feedbackTypes.length];
        const userName = getUserName(user);

        assessments.push({
            assessor: assessmentAssessor?._id || userMap['Robert Taylor']._id,
            assessee: user._id,
            period: index % 2 === 0 ? 'Q1 2026' : 'Annual 2026',
            type: index % 3 === 0 ? 'annual' : 'quarterly',
            status: assessmentStatus,
            skillRatings: assesseeSkills.map((entry, skillIndex) => ({
                skill: entry.skill,
                rating: Math.max(1, Math.min(9, (entry.proficiencyLevel || 5) + (skillIndex % 2))),
                comments: `${userName} continues to show steady growth in this area.`,
            })),
            performanceRating: Math.max(3, Math.min(9, averageRatingBase)),
            strengths: [
                assessmentStrengthsPool[index % assessmentStrengthsPool.length],
                assessmentStrengthsPool[(index + 2) % assessmentStrengthsPool.length],
            ],
            areasForImprovement: [
                assessmentImprovementPool[index % assessmentImprovementPool.length],
                assessmentImprovementPool[(index + 3) % assessmentImprovementPool.length],
            ],
            goals: [
                {
                    description: `Deepen ownership in ${assesseeSkills[0] ? skills.find((skill) => String(skill._id) === String(assesseeSkills[0].skill))?.name || 'core delivery' : 'core delivery'}.`,
                    targetDate: dayOffset(-45 - index),
                    status: assessmentStatus === 'completed' ? 'completed' : 'in_progress',
                },
                {
                    description: 'Share progress regularly with the wider team.',
                    targetDate: dayOffset(-75 - index),
                    status: 'pending',
                },
            ],
            overallComments: `${userName} is making a positive impact and has clear next-step growth opportunities.`,
            assesseeAcknowledged: index % 4 !== 0,
            assesseeComments: index % 4 !== 0 ? 'Thanks for the clear feedback and next steps.' : '',
            acknowledgedAt: index % 4 !== 0 ? acknowledgedAt : undefined,
            submittedAt,
            reviewedAt: assessmentStatus !== 'submitted' ? reviewedAt : undefined,
            completedAt: assessmentStatus === 'completed' ? acknowledgedAt : undefined,
            createdAt: dayOffset(createdDaysAgo),
            updatedAt: dayOffset(Math.max(createdDaysAgo - 1, 0)),
        });

        feedbackEntries.push({
            giver: feedbackGiver?._id || userMap['Robert Taylor']._id,
            receiver: user._id,
            type: feedbackType,
            visibility: 'manager_only',
            title: `${FEEDBACK_TYPE_LABELS[feedbackType]} for ${user.firstName}`,
            content: `${userName} has been contributing well and should keep building momentum on the team priorities this quarter.`,
            period: index % 2 === 0 ? 'Q1 2026' : 'Sprint 6',
            reviewType: index % 2 === 0 ? 'quarterly' : 'project',
            strengths: [
                feedbackStrengthsPool[index % feedbackStrengthsPool.length],
                feedbackStrengthsPool[(index + 1) % feedbackStrengthsPool.length],
            ],
            areasForImprovement: [
                feedbackImprovementPool[index % feedbackImprovementPool.length],
            ],
            relatedSkill: assesseeSkills[0]?.skill,
            isReviewed: index % 5 === 0,
            reviewedBy: index % 5 === 0 ? (assessmentAssessor?._id || userMap['Robert Taylor']._id) : undefined,
            reviewedAt: index % 5 === 0 ? reviewedAt : undefined,
            managerNotes: index % 5 === 0 ? 'Useful input for the next review cycle.' : '',
            isAcknowledged: index % 3 !== 0,
            acknowledgedAt: index % 3 !== 0 ? acknowledgedAt : undefined,
            receiverResponse: index % 3 !== 0 ? 'Appreciate the feedback.' : '',
            createdAt: dayOffset(30 - (index % 15)),
            updatedAt: dayOffset(Math.max(29 - (index % 15), 0)),
        });
    });

    console.log('Creating assessments...');
    const insertedAssessments = await Assessment.insertMany(assessments);

    console.log('Creating feedback...');
    const insertedFeedback = await Feedback.insertMany(feedbackEntries);

    console.log('Seed completed successfully.');
    console.log(`Created ${departments.length} departments, ${sections.length} sections, ${teams.length} teams, ${users.length} users, ${projectPositions.length} company positions, ${skills.length} skills, ${insertedUserSkills.length} user skills, ${insertedAssessments.length} assessments, ${insertedFeedback.length} feedback entries, and ${insertedEndorsements.length} endorsements.`);
    console.log('Sample logins:');
    console.log('  robert.taylor@company.com / Password123');
    console.log('  john.doe@company.com / Password123');
    console.log('  mia.turner@company.com / Password123');

    await mongoose.disconnect();
}

seedDatabase().catch((error) => {
    console.error('Seed failed:', error);
    mongoose.disconnect();
    process.exit(1);
});
