import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username) {
      login(username);
    }
  };

  return (
    <div className="row">
      <div className="col s12">
        <div className="input-field col s12 m6">
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label htmlFor="username">Usuario</label>
        </div>
        <div className="col s12 m6">
          <button className="btn teal waves-effect waves-light" onClick={handleSubmit}>
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;