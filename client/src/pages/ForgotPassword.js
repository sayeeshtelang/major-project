import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Shield className="auth-logo" />
          <h2>Reset Password</h2>
          <p>Enter your email to receive a reset link</p>
        </div>
        
        {!submitted ? (
          <form className="auth-form" onSubmit={handleSubmit}>
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
            
            <button type="submit" className="auth-submit-btn">Send Reset Link</button>
          </form>
        ) : (
          <div className="auth-success-message">
            <p>If an account exists for {email}, you will receive a password reset link shortly.</p>
          </div>
        )}
        
        <div className="auth-footer">
          <p><Link to="/login" className="back-link"><ArrowLeft size={16} /> Back to Login</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
