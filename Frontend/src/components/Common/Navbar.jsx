import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h2>Chat App</h2>
      </div>

      <div className="navbar-right">
        <span className="username">👤 {user?.username}</span>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}