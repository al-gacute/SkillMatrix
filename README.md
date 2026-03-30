# SkillMatrix

A full-stack skills management platform built with React, TypeScript, Node.js, Express, and MongoDB.

## Project Guardrails

The authoritative target rules for this repository are documented in [docs/SKILLMATRIX_GUARDRAILS.md](/c:/Users/105-0120/Desktop/SkillMatrix/docs/SKILLMATRIX_GUARDRAILS.md).

## Features

- **User Authentication**: JWT-based authentication with login/register
- **Skills Management**: Add, edit, and track your skills with proficiency levels
- **Skill Categories**: Organize skills into categories
- **Endorsements**: Endorse colleagues' skills to validate their expertise
- **Teams & Departments**: Organize users into teams and departments
- **Dashboard**: View skill statistics and analytics
- **Reports**: Skill gap analysis, trends, and top endorsers
- **Responsive Design**: Modern UI with Tailwind CSS

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Recharts for charts
- Axios for API calls

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing

## Project Structure

```
skillmatrix/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Backend Node.js application
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # Express routes
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # App entry point
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd client
npm install
```

4. Configure environment variables:
```bash
# In server folder, create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

For the frontend, create `client/.env` from `client/.env.example`. Use `VITE_API_URL=/api` when the frontend and API share one origin, or set it to your deployed backend URL such as `https://your-api.onrender.com/api` when they are separate services.

The API boot process also ensures the core system roles and the two default admin accounts exist in the connected database. On startup, those built-in admin accounts are synchronized to the configured credentials unless `SYNC_DEFAULT_ADMIN_PASSWORDS=false` is set.

### Development

1. Start MongoDB (if running locally)

2. Start the backend server:
```bash
cd server
npm run dev
```

3. Start the frontend development server:
```bash
cd client
npm run dev
```

4. Open http://localhost:3000 in your browser

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Create skill (admin/manager)
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### User Skills
- `GET /api/user-skills/me` - Get my skills
- `GET /api/user-skills/user/:id` - Get user's skills
- `POST /api/user-skills` - Add skill to profile
- `PUT /api/user-skills/:id` - Update user skill
- `DELETE /api/user-skills/:id` - Remove user skill
- `POST /api/user-skills/:id/endorse` - Endorse skill
- `DELETE /api/user-skills/:id/endorse` - Remove endorsement

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user details

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team details
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Departments
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get department details
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/skill-gaps` - Skill gap analysis
- `GET /api/analytics/top-endorsers` - Top endorsers
- `GET /api/analytics/trends` - Skill trends

## Azure Deployment

See deployment configuration files in the repository for Azure App Service and Azure Static Web Apps deployment.

## License

MIT
