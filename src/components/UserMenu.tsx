import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { ProfileSettings } from './ProfileSettings';
import './UserMenu.css';

export function UserMenu() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  if (isLoading) {
    return <div className="user-menu-loading" />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <button 
          className="signin-btn"
          onClick={() => setShowAuthModal(true)}
        >
          Sign In
        </button>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    );
  }

  return (
    <>
      <button 
        className="user-menu-btn"
        onClick={() => setShowProfileSettings(true)}
        title={user?.email}
      >
        <div className="user-avatar">
          {user?.email?.charAt(0).toUpperCase()}
        </div>
      </button>
      <ProfileSettings 
        isOpen={showProfileSettings} 
        onClose={() => setShowProfileSettings(false)} 
      />
    </>
  );
}

