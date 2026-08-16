import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Wrench, ArrowRight } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your work email address.');
      return;
    }

    if (targetEmail.includes('worker')) {
      onLogin({
        id: 'worker-4422',
        name: 'David Vance',
        email: targetEmail,
        role: 'worker',
        verification_status: 'verified',
        skills: ['Electrical Repair', 'Plumbing', 'HVAC Installation'],
        rating: 4.95,
        ratings_count: 38,
      });
    } else {
      onLogin({
        id: 'user-8899',
        name: 'Samantha Wright',
        email: targetEmail,
        role: 'user',
      });
    }
  };

  const handleQuickDemo = (roleType) => {
    if (roleType === 'worker') {
      onLogin({
        id: 'worker-4422',
        name: 'David Vance',
        email: 'worker@workhire.com',
        role: 'worker',
        verification_status: 'verified',
        skills: ['Electrical Repair', 'Plumbing', 'HVAC Installation'],
        rating: 4.95,
        ratings_count: 38,
      });
    } else {
      onLogin({
        id: 'user-8899',
        name: 'Samantha Wright',
        email: 'client@workhire.com',
        role: 'user',
      });
    }
  };

  return (
    <div className="login-page">
      {/* Left — Navy Brand Panel */}
      <aside className="login-aside">
        <div className="aside-top">
          <div className="brand">
            <div className="brand-mark">W</div>
            <span className="brand-name">WorkHire</span>
          </div>
          <p className="aside-tagline">
            The enterprise platform for on-demand service contracting and skilled worker dispatch.
          </p>
        </div>

        <div className="aside-stats">
          <div className="stat-item">
            <span className="stat-value">4,200+</span>
            <span className="stat-label">Verified Workers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">98.4%</span>
            <span className="stat-label">Job Completion Rate</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">12,000+</span>
            <span className="stat-label">Requests Fulfilled</span>
          </div>
        </div>

        <div className="aside-footer">
          <p>© 2026 WorkHire Inc. All rights reserved.</p>
        </div>
      </aside>

      {/* Right — Login Form */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-card-header">
            <h1>Sign in to your account</h1>
            <p>Enter your credentials or use 1-click quick demo access.</p>
          </div>

          <form className="login-form" onSubmit={handleFormSubmit}>
            {error && (
              <div className="form-error-banner">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Work Email Address</label>
              <div className="input-group">
                <Mail size={16} className="input-prefix-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="client@workhire.com or worker@workhire.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>
                <a href="#forgot" className="link-sm">Forgot password?</a>
              </div>
              <div className="input-group">
                <Lock size={16} className="input-prefix-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-sign-in">
              Sign in with Email
            </button>
          </form>

          {/* Quick Demo Access Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0 16px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gray-400)', letterSpacing: '0.5px' }}>
              OR 1-CLICK DEMO ACCESS
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'center', padding: '10px', fontSize: '13px' }}
              onClick={() => handleQuickDemo('user')}
            >
              <User size={15} color="var(--navy)" /> Client Demo
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'center', padding: '10px', fontSize: '13px' }}
              onClick={() => handleQuickDemo('worker')}
            >
              <Wrench size={15} color="#16a34a" /> Worker Demo
            </button>
          </div>

          <div className="login-card-footer">
            <p>Don't have an account? <a href="#register" className="link-primary">Contact your administrator</a></p>
          </div>
        </div>
      </main>
    </div>
  );
}
