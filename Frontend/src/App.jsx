import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';
import Navbar from './components/Common/Navbar';
import './App.css';

function App() {
  const { token, checkAuth } = useAuthStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/chats" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/chats" />} />

        {/* Protected Routes */}
        {token ? (
          <>
            <Route
              path="/chats"
              element={
                <>
                  <Navbar />
                  <div className="chats-container">
                    <ChatList />
                    <ChatWindow />
                  </div>
                </>
              }
            />
            <Route path="/" element={<Navigate to="/chats" />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to={token ? '/chats' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;