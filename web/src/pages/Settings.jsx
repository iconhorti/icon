import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { User, Lock, Bell, Palette, Save, CheckCircle } from 'lucide-react';
import { updateUser, changePassword } from '../api/client';
import './Settings.css';

const Settings = () => {
  const { user: user } = useAuth();

  // Guard: settings page is for admin / owner only
  if (!['admin', 'owner'].includes(user.role)) return <Navigate to="/" replace />;
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    first_name: user.first_name || '',
    phone: '',
    email: '',
  });
  const [notifications, setNotifications] = useState({
    project_updates: true,
    subsidy_alerts: true,
    new_farmers: false,
    weekly_report: true,
  });
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUser(user.id, {
        first_name: profile.first_name,
        email: profile.email,
      });
      const updated = { ...user, first_name: profile.first_name, email: profile.email };
      localStorage.setItem('icon_user', JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    setPwSuccess(false);
    if (!passwords.newPw || passwords.newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (passwords.newPw !== passwords.confirm) {
      setPwError('Passwords do not match.');
      return;
    }
    try {
      await changePassword(passwords.current, passwords.newPw);
      setPwSuccess(true);
      setPasswords({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err.response?.data?.detail || 'Failed to change password.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences and notification settings.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      <div className="settings-grid">
        {/* Profile Settings */}
        <div className="glass-card settings-card animate-fade-in animate-delay-1">
          <div className="settings-card-header">
            <User size={20} />
            <h2>Profile</h2>
          </div>
          <div className="input-group">
            <label className="input-label">Display Name</label>
            <input
              type="text"
              className="input-field"
              value={profile.first_name}
              onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input
              type="tel"
              className="input-field"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="Your phone number"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input-field"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              placeholder="Your email address"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Role</label>
            <input type="text" className="input-field" value={user.role || 'admin'} disabled style={{ opacity: 0.5 }} />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass-card settings-card animate-fade-in animate-delay-2">
          <div className="settings-card-header">
            <Bell size={20} />
            <h2>Notifications</h2>
          </div>
          {[
            { key: 'project_updates', label: 'Project Stage Updates', desc: 'Get notified when a project moves to a new stage' },
            { key: 'subsidy_alerts',  label: 'Subsidy Alerts',        desc: 'Inspection requests, disbursements, and approvals' },
            { key: 'new_farmers',     label: 'New Farmer Onboarding', desc: 'Alerts when a new farmer is registered' },
            { key: 'weekly_report',   label: 'Weekly Summary Report', desc: 'Receive a weekly digest of all project activities' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="toggle-row">
              <div>
                <p className="toggle-label">{label}</p>
                <p className="toggle-desc">{desc}</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications[key]}
                  onChange={e => setNotifications(n => ({ ...n, [key]: e.target.checked }))}
                />
                <span className="toggle-thumb" />
              </label>
            </div>
          ))}
        </div>

        {/* Security Settings */}
        <div className="glass-card settings-card animate-fade-in animate-delay-3">
          <div className="settings-card-header">
            <Lock size={20} />
            <h2>Security</h2>
          </div>
          {pwSuccess && <div className="alert alert-success">Password updated successfully!</div>}
          {pwError && <div className="alert alert-danger">{pwError}</div>}
          <div className="input-group">
            <label className="input-label">Current Password</label>
            <input type="password" className="input-field" placeholder="••••••••" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">New Password</label>
            <input type="password" className="input-field" placeholder="Min 6 characters" value={passwords.newPw} onChange={e => setPasswords(p => ({ ...p, newPw: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm New Password</label>
            <input type="password" className="input-field" placeholder="Repeat new password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button className="btn btn-outline w-full" style={{ marginTop: '0.5rem' }} onClick={handlePasswordChange}>
            <Lock size={16} /> Update Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
