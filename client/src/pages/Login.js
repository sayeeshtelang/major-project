import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate login
    navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Shield className="auth-logo" />
          <h2>Welcome Back</h2>
          <p>Login to your operator dashboard</p>
        </div>
        
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@energygrid.com"
              required 
            />
          </div>
          
          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
            </div>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          
          <button type="submit" className="auth-submit-btn">Login to Dashboard</button>
        </form>
        
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Request Access</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
