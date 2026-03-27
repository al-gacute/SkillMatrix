import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import NativePickerBehavior from './components/NativePickerBehavior';
import GlobalProficiencyGuide from './components/GlobalProficiencyGuide';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <NativePickerBehavior />
                <App />
                <GlobalProficiencyGuide />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);
