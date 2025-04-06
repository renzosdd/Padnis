import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username) {
      login(username);
    }
  };

  return (
    <div className="row">
      <form className="col s12" onSubmit={handleSubmit}>
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
          <button className="btn teal waves-effect waves-light" type="submit">
            Iniciar sesión
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;