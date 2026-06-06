import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import Navbar from './components/Common/Navbar';
import './App.css';

// Protected route guard component
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

// Public route guard component
const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();
  return !token ? children : <Navigate to="/chats" replace />;
};

function App() {
  const { checkAuth, isLoading } = useAuthStore();

  // Add checkAuth to dependency array
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Loading screen prevents layout flash during auth verification
  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner"></div>
        <p>Verifying secure session...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
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

        {/* Protected Routes — Static configuration */}
        <Route
          path="/chats"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <div className="chats-container">
                  <ChatList />
                  <ChatWindow />
                </div>
              </>
            </ProtectedRoute>
          }
        />

        {/* Fallback Routes */}
        <Route path="/" element={<Navigate to="/chats" replace />} />
        <Route path="*" element={<Navigate to="/chats" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;