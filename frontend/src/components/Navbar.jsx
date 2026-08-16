import React, { useState } from 'react';
import { Bell, Clock, ShieldCheck } from 'lucide-react';

export default function Navbar({ currentUser, onLogout, activeTab, setActiveTab }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New bid received for "Commercial HVAC Maintenance" ($140.00)', time: '5m ago', unread: true },
    { id: 2, text: 'Worker David Vance accepted your direct request REQ-902', time: '1h ago', unread: true },
    { id: 3, text: 'Job status updated to COMPLETED for Request REQ-903', time: '3h ago', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    setShowNotifications(false);
  };

  const initials = currentUser.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userTabs = [
    { key: 'requests', label: 'My Requests' },
    { key: 'create', label: 'Post a Job' },
    { key: 'workers', label: 'Worker Directory' },
  ];

  const workerTabs = [
    { key: 'marketplace', label: 'Marketplace Jobs' },
    { key: 'incoming', label: 'Direct Requests' },
    { key: 'my-bids', label: 'My Bids' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'profile', label: 'My Profile' },
  ];

  const tabs = currentUser.role === 'user' ? userTabs : workerTabs;

  return (
    <header className="navbar">
      <div className="navbar-left">
        {/* Brand */}
        <div className="nav-brand">
          <div className="nav-brand-mark">W</div>
          <span className="nav-brand-name">WorkHire</span>
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="navbar-right">
        {/* Role indicator */}
        <span className="nav-role-badge">
          {currentUser.role === 'worker' ? (
            <>{currentUser.verification_status === 'verified' && <ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} />}Worker</>
          ) : 'Requester'}
        </span>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ position: 'relative', padding: '6px 10px' }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                background: '#dc2626',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '340px',
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 300,
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-800)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: '12px', color: 'var(--navy)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--gray-100)',
                  background: item.unread ? '#f8faff' : 'transparent',
                }}>
                  <Clock size={14} style={{ color: 'var(--gray-400)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: 1.5 }}>{item.text}</p>
                    <span style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="nav-user-badge">
          <div className="nav-avatar">{initials}</div>
          <span className="nav-user-name">{currentUser.name.split(' ')[0]}</span>
        </div>

        {/* Logout */}
        <button className="btn-logout" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
