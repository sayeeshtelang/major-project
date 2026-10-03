import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-logo">
          <Shield className="logo-icon" />
          <div className="logo-text">
            <strong>MERN</strong>Energy
            <span>Smart Grid Platform</span>
          </div>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-link">Login</Link>
          <Link to="/login" className="landing-btn-outline">Sign Up</Link>
        </div>
      </nav>

      <main className="landing-main">
        <div className="hero-section">
          <h1 className="hero-title">
            AI-Powered Energy Platform<br />
            <span className="hero-highlight">with Real-Time Monitoring</span>
          </h1>
          <p className="hero-subtitle">
            Create advanced forecasts, monitor grid stability, and analyze performance instantly — all in one system.
          </p>
          <p className="hero-microtext">Built for real energy grids, not just models.</p>
          
          <div className="hero-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-primary-large">
              Get Started Free <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary-large">
              View Dashboard
            </button>
          </div>
          <p className="hero-footer-text">No installation required. Works instantly in your browser.</p>
        </div>

        <div className="features-section">
          <h2>Everything You Need for Effective Energy Management</h2>
          <p>Powerful features designed for modern grid operators</p>
        </div>
      </main>
    </div>
  );
};

export default Landing;
