import React, { useState } from 'react';
import './App.css';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import UserDashboard from './components/UserDashboard';
import WorkerDashboard from './components/WorkerDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('requests');

  const handleLogin = (user) => {
    setCurrentUser(user);
    // Explicitly set activeTab according to role
    if (user.role === 'worker') {
      setActiveTab('marketplace');
    } else {
      setActiveTab('requests');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('requests');
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="dashboard-layout">
        {currentUser.role === 'user' ? (
          <UserDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <WorkerDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </div>
    </div>
  );
}

export default App;
