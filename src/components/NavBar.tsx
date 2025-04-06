import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav>
      <div className="nav-wrapper teal">
        <a href="#" className="brand-logo" style={{ marginLeft: '20px' }}>
          Tenis & Padel Uruguay
        </a>
        {user && (
          <ul className="right">
            <li>
              <a href="#" onClick={logout}>
                Cerrar sesión ({user})
              </a>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
};

export default NavBar;