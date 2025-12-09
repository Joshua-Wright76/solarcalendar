import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, createOrUpdateProfile, updateBirthday, UserProfile } from '../api/profile';
import { gregorianToSolar, SolarDate } from '../utils/solarCalendar';
import './ProfileSettings.css';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
  const { user, getIdToken, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [birthday, setBirthday] = useState('');
  const [solarBirthday, setSolarBirthday] = useState<SolarDate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (birthday) {
      const date = new Date(birthday + 'T12:00:00');
      const solar = gregorianToSolar(date);
      setSolarBirthday(solar);
    } else {
      setSolarBirthday(null);
    }
  }, [birthday]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      let userProfile = await getProfile(getIdToken);
      
      // If no profile exists, create one
      if (!userProfile) {
        userProfile = await createOrUpdateProfile(getIdToken);
      }
      
      setProfile(userProfile);
      if (userProfile.birthday) {
        setBirthday(userProfile.birthday.split('T')[0]);
      }
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBirthday = async () => {
    if (!birthday) return;
    
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const updatedProfile = await updateBirthday(getIdToken, birthday);
      setProfile(updatedProfile);
      setSuccess('Birthday saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save birthday');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  const formatSolarBirthday = (solar: SolarDate): string => {
    if (solar.isSolsticeDay) {
      return `Solstice Day ${solar.solsticeDay} of ${solar.year}`;
    }
    
    const seasonNames = ['Winter', 'Spring', 'Summer', 'Autumn'];
    const seasonIndex = Math.floor((solar.month! - 1) / 3);
    const monthInSeason = ((solar.month! - 1) % 3) + 1;
    
    return `${seasonNames[seasonIndex]} ${monthInSeason}, Day ${solar.day} of Year ${solar.year}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        
        <h2 className="profile-title">Profile Settings</h2>

        {isLoading ? (
          <div className="profile-loading">Loading...</div>
        ) : (
          <>
            <div className="profile-section">
              <h3>Account</h3>
              <div className="profile-info">
                <span className="profile-label">Email</span>
                <span className="profile-value">{user?.email}</span>
              </div>
            </div>

            <div className="profile-section">
              <h3>Your Solar Birthday</h3>
              
              {error && <div className="profile-error">{error}</div>}
              {success && <div className="profile-success">{success}</div>}
              
              <div className="birthday-form">
                <div className="form-group">
                  <label htmlFor="birthday">Birthday (Gregorian)</label>
                  <input
                    type="date"
                    id="birthday"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </div>
                
                {solarBirthday && (
                  <div className="solar-birthday-display">
                    <div className="solar-birthday-label">Your Solar Calendar Birthday</div>
                    <div className="solar-birthday-value">
                      {formatSolarBirthday(solarBirthday)}
                    </div>
                  </div>
                )}
                
                <button 
                  className="save-birthday-btn"
                  onClick={handleSaveBirthday}
                  disabled={isSaving || !birthday || birthday === profile?.birthday?.split('T')[0]}
                >
                  {isSaving ? 'Saving...' : 'Save Birthday'}
                </button>
              </div>
            </div>

            <div className="profile-section profile-actions">
              <button className="signout-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

