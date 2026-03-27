import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MySkills from './pages/MySkills';
import Profile from './pages/Profile';
import BrowseMatrix from './pages/BrowseMatrix';
import BrowseMatrixDetail from './pages/BrowseMatrixDetail';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Skills from './pages/Skills';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Departments from './pages/Departments';
import Sections from './pages/Sections';
import Analytics from './pages/Analytics';
import Assessments from './pages/Assessments';
import Feedback from './pages/Feedback';
import Roles from './pages/Roles';
import ProjectPosition from './pages/ProjectPosition';
import LoadingSpinner from './components/LoadingSpinner';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <PublicRoute>
                        <Landing />
                    </PublicRoute>
                }
            />
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                }
            />
            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <Layout />
                    </PrivateRoute>
                }
            >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="my-skills" element={<MySkills />} />
                <Route path="browse-matrix" element={<BrowseMatrix />} />
                <Route path="browse-matrix/:id" element={<BrowseMatrixDetail />} />
                <Route path="profile" element={<Profile />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="feedback" element={<Feedback />} />
                <Route path="users" element={<Users />} />
                <Route path="users/:id" element={<UserDetail />} />
                <Route path="skills" element={<Skills />} />
                <Route path="teams" element={<Teams />} />
                <Route path="teams/:id" element={<TeamDetail />} />
                <Route path="departments" element={<Departments />} />
                <Route path="sections" element={<Sections />} />
                <Route path="roles" element={<Roles />} />
                <Route path="project-position" element={<ProjectPosition />} />
                <Route path="analytics" element={<Analytics />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
