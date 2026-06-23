import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import defaultAvatar from '../constants/defaultAvatar';
import { API_BASE, getAuthHeaders, parseApiResponse } from '../utils/api';
import { formatMssv } from '../utils/studentId';
import { resolveUserAvatar } from '../utils/image';
import AvatarCropModal from '../components/profile/AvatarCropModal';
import { getRoleLabel } from '../utils/role';
import { logoutWithConfirm } from '../utils/logout';
import { dispatchAuthChanged } from '../utils/authEvents';
import { cacheUserProfile } from '../hooks/useUserProfile';
import { buildProfilePicturePayload, updateUserAvatar } from '../utils/profileApi';
import { isAdminRole, isCtsvRole, normalizeRole } from '../utils/auth';
import DashboardSidebarNav from '../components/DashboardSidebarNav';
import ProfilePasswordSection from '../components/profile/ProfilePasswordSection';
import { FE_LOGO, FE_LOGO_ALT } from '../assets/brand';
import { useTranslation } from '../i18n/I18nContext';

/** Stored in DB — keep Vietnamese values for API compatibility */
const INTEREST_STORAGE = {
  hardware: 'Phần cứng & Vi điều khiển',
  ai: 'AI',
  japan: 'Văn hóa Nhật Bản',
  charity: 'Thiện nguyện',
  sports: 'Thể thao',
  music: 'Âm nhạc & Nghệ thuật',
};

const Profile = ({ showToast, embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Profile data from backend
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    fullname: '',
    course: '',
    campus: '',
    email: localStorage.getItem('userEmail') || '',
    phone: ''
  });

  // Role & Student ID for FPT recognition
  const [userRole, setUserRole] = useState('guest');
  const [studentId, setStudentId] = useState('');

  // Track if course cohort has been changed once
  const [courseChanged, setCourseChanged] = useState(false);

  const [sidebarActive, setSidebarActive] = useState(false);

  const profileSectionRef = useRef(null);

  // Edit profile mode state
  const [isEditing, setIsEditing] = useState(false);
  const [backupData, setBackupData] = useState(null);

  // Avatar Upload State
  const [avatar, setAvatar] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState('');
  const [avatarCropFileName, setAvatarCropFileName] = useState('');

  // Form Orientation State
  const [orientation, setOrientation] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [favoriteClubs, setFavoriteClubs] = useState([]);

  // Load profile from Backend on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setProfileLoading(false);
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/api/user/profile`, { headers: getAuthHeaders(false) })
      .then(res => {
        if (res.status === 200) {
          return res.json();
        } else {
          throw new Error('Failed to load profile');
        }
      })
      .then(data => {
        const u = data.user;
        setProfileData({
          fullname: u.fullname || '',
          course: u.course || '',
          campus: u.campus || '',
          email: u.email || '',
          phone: u.phone || ''
        });
        setCourseChanged(u.courseChanged || false);
        setAvatar(resolveUserAvatar(u, ''));
        if (u.orientation !== undefined) {
          setOrientation(u.orientation);
        }
        // Load role & studentId
        if (u.role) setUserRole(u.role);
        if (u.studentId) setStudentId(formatMssv(u.studentId));

        // Populate interests checklist state
        if (u.interests) {
          setInterests({
            hardware: u.interests.includes(INTEREST_STORAGE.hardware),
            ai: u.interests.includes(INTEREST_STORAGE.ai),
            japan: u.interests.includes(INTEREST_STORAGE.japan),
            charity: u.interests.includes(INTEREST_STORAGE.charity),
            sports: u.interests.includes(INTEREST_STORAGE.sports),
            music: u.interests.includes(INTEREST_STORAGE.music),
          });
        }
      })
      .catch(err => {
        console.error(err);
        showToast(t('profile.toast.loadFail'), 'error');
      })
      .finally(() => setProfileLoading(false));
  }, [navigate, showToast, t]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch(`${API_BASE}/api/user/my-clubs?tab=following`, { headers: getAuthHeaders(false) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.clubs)) {
          setFavoriteClubs(data.clubs.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  // Interests Checklist State
  const [interests, setInterests] = useState({
    hardware: false,
    ai: false,
    japan: false,
    charity: false,
    sports: false,
    music: false
  });

  // Handle Sidebar Menu item click
  const handleFeatureNotImplemented = (e) => {
    e.preventDefault();
    showToast(t('profile.toast.featureDev'), 'info');
  };

  const handleSidebarNavigate = (path) => (e) => {
    e.preventDefault();
    setSidebarActive(false);
    navigate(path);
  };

  const handleScanClick = () => {
    navigate('/quet-qr');
  };

  const displayAvatar = avatar || defaultAvatar;
  const profilePageTitle = t('profile.page.title');
  const isCtsvEmbedded = embedded && isCtsvRole(userRole) && !isAdminRole(userRole);
  const isAdminEmbedded = embedded && isAdminRole(userRole);

  const profileFormTitle = isCtsvEmbedded
    ? t('profile.page.formCtsv')
    : isAdminEmbedded
      ? t('profile.page.title')
      : t('profile.page.titleWithInterests');

  const passwordDescription = (() => {
    const role = normalizeRole(userRole);
    if (role === 'admin') return t('admin.profile.passwordDesc');
    if (role === 'ctsv') return t('profile.passwordDesc.ctsv');
    return t('profile.passwordDesc.default');
  })();

  const avatarButtonLabel = avatarSaving
    ? t('profile.avatar.saving')
    : avatarCropOpen
      ? t('profile.avatar.editing')
      : t('profile.avatar.change');

  const handleNavigateProfile = (e) => {
    e.preventDefault();
    setSidebarActive(false);
    setIsEditing(false);
    profileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveAvatarToBackend = async (imageData) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      showToast(t('profile.toast.sessionExpired'), 'error');
      return;
    }

    setAvatarSaving(true);
    try {
      const data = await updateUserAvatar(imageData);
      if (data.user) {
        const nextAvatar = resolveUserAvatar(data.user, '');
        setAvatar(nextAvatar);
        cacheUserProfile({
          fullname: data.user.fullname || profileData.fullname,
          course: data.user.course || profileData.course,
          role: normalizeRole(data.user.role || userRole),
          picture: nextAvatar
        });
        dispatchAuthChanged();
      }
      showToast(t('profile.toast.avatarUpdated'), 'success');
    } catch (err) {
      showToast(err.message || t('profile.toast.avatarSaveFail'), 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(t('profile.toast.imageOnly'), 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('profile.toast.imageSize'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropSrc(reader.result);
      setAvatarCropFileName(file.name);
      setAvatarCropOpen(true);
    };
    reader.onerror = () => showToast(t('profile.toast.imageReadFail'), 'error');
    reader.readAsDataURL(file);
  };

  const handleAvatarCropCancel = () => {
    setAvatarCropOpen(false);
    setAvatarCropSrc('');
    setAvatarCropFileName('');
  };

  const handleAvatarCropConfirm = async (dataUrl) => {
    setAvatarCropOpen(false);
    setAvatarCropSrc('');
    setAvatarCropFileName('');

    if (!dataUrl) {
      showToast(t('profile.toast.imageProcessFail'), 'error');
      return;
    }
    if (dataUrl.length > 750000) {
      showToast(t('profile.toast.imageTooLarge'), 'error');
      return;
    }

    setAvatar(dataUrl);
    await saveAvatarToBackend(dataUrl);
  };

  // Handle Interest Tag Checkbox Toggle
  const handleInterestChange = (e, key, label) => {
    const checked = e.target.checked;
    setInterests(prev => ({ ...prev, [key]: checked }));
  };  // Handle Profile Info Save
  const handleProfileSubmit = (e) => {
    e.preventDefault();

    if (userRole !== 'student' && !profileData.fullname.trim()) {
      showToast(t('profile.toast.fullNameRequired'), 'error');
      return;
    }

    if (userRole === 'student' && !orientation.trim()) {
      showToast(t('profile.toast.orientationRequired'), 'error');
      return;
    }

    setSaveLoading(true);

    const activeInterests = Object.keys(interests)
      .filter((k) => interests[k])
      .map((k) => INTEREST_STORAGE[k]);

    fetch(`${API_BASE}/api/user/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...(userRole !== 'student' ? { fullname: profileData.fullname.trim() } : {}),
        phone: profileData.phone.trim(),
        ...(userRole === 'student' || orientation.trim()
          ? { orientation: orientation.trim() }
          : {}),
        interests: activeInterests,
        ...buildProfilePicturePayload(avatar, displayAvatar)
      })
    })
      .then(parseApiResponse)
      .then(async ({ ok, status, data }) => {
        setSaveLoading(false);
        if (ok && status === 200 && data.success !== false) {
          setIsEditing(false);
          if (data.user) {
            setProfileData({
              fullname: data.user.fullname || '',
              course: data.user.course || '',
              campus: data.user.campus || '',
              email: data.user.email || '',
              phone: data.user.phone || ''
            });
            setCourseChanged(data.user.courseChanged || false);
            if (data.user.picture || data.user.avatar) {
              setAvatar(resolveUserAvatar(data.user, ''));
            }
            cacheUserProfile({
              fullname: data.user.fullname || '',
              course: data.user.course || '',
              role: normalizeRole(data.user.role || userRole),
              picture: resolveUserAvatar(data.user, displayAvatar)
            });
            dispatchAuthChanged();
          }
          showToast(t('profile.toast.updateSuccess'), 'success');
        } else {
          showToast(data.message || t('profile.toast.updateFail'), 'error');
        }
      })
      .catch(() => {
        setSaveLoading(false);
        showToast(t('profile.toast.serverError'), 'error');
      });
  };
  const startEditing = () => {
    setBackupData({
      profileData: { ...profileData },
      orientation,
      interests: { ...interests }
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (backupData) {
      setProfileData(backupData.profileData);
      setOrientation(backupData.orientation);
      setInterests(backupData.interests);
    }
    setIsEditing(false);
  };

  const handleLogout = (e) => {
    e?.preventDefault?.();
    logoutWithConfirm(navigate, {
      showToast,
      toastMessage: embedded ? t('profile.toast.logoutCtsv') : t('profile.toast.logout')
    });
  };

  const renderAvatarCard = () => (
    <div className={`profile-card avatar-card${embedded ? ' ctsv-profile-avatar-card' : ''}`}>
      {embedded && <h2 className="profile-card-title">{t('profile.avatar.title')}</h2>}
      <div className={`avatar-card-content${embedded ? ' ctsv-profile-avatar-body' : ''}`}>
        <div className="profile-avatar-container">
          <img className="large-profile-avatar" id="profile-avatar-img" src={displayAvatar} alt={t('profile.avatar.alt')} />
          <label htmlFor="avatar-upload-input" className="btn-avatar-edit-pencil" title={t('profile.avatar.change')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </label>
          <input
            type="file"
            id="avatar-upload-input"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
        {embedded ? (
          <div className="ctsv-profile-avatar-info">
            <p className="ctsv-profile-avatar-name">{profileData.fullname || '—'}</p>
            <p className="ctsv-profile-avatar-role">{getRoleLabel(userRole)}</p>
            <p className="ctsv-profile-avatar-email">{profileData.email}</p>
            <button
              type="button"
              className="btn-upload-avatar"
              disabled={avatarSaving || avatarCropOpen}
              onClick={() => document.getElementById('avatar-upload-input').click()}
            >
              {avatarButtonLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-upload-avatar"
            disabled={avatarSaving || avatarCropOpen}
            onClick={() => document.getElementById('avatar-upload-input').click()}
          >
            {avatarButtonLabel}
          </button>
        )}
      </div>
    </div>
  );

  const profileContent = (
    <div className={`dashboard-content-wrapper${embedded ? ' ctsv-profile-content' : ''}`}>
      <div className={embedded ? 'ctsv-profile-grid' : 'profile-grid'}>
        {profileLoading ? (
          <div className="profile-page-loading" aria-busy="true" aria-label={t('profile.page.loading')}>
            <div className="profile-skeleton profile-skeleton--avatar-lg" />
            <div className="profile-skeleton profile-skeleton--block" />
            <div className="profile-skeleton profile-skeleton--block profile-skeleton--block-short" />
          </div>
        ) : (
        <>
        {embedded ? (
          renderAvatarCard()
        ) : (
          <div className="profile-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderAvatarCard()}
            <div className="profile-card clubs-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{t('profile.clubs.favorites')}</span>
                </div>
                <Link to="/my-clubs" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {t('profile.clubs.viewAll')}
                </Link>
              </div>
              <div className="tag-list">
                {favoriteClubs.length === 0 ? (
                  <span className="club-tag club-tag--empty">{t('profile.clubs.empty')}</span>
                ) : (
                  favoriteClubs.map((club) => (
                    <Link key={club.id} to={`/clubs/${club.slug}`} className="club-tag">
                      {club.name}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div
          className={embedded ? 'ctsv-profile-main-column' : 'profile-right-column'}
          ref={profileSectionRef}
        >
          <form
            id="profile-edit-form"
            onSubmit={handleProfileSubmit}
            className={`profile-card${embedded ? ' ctsv-profile-form-card' : ''}`}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h2 className="profile-card-title" style={{ marginBottom: '4px' }}>
              {profileFormTitle}
            </h2>

                  <div className="profile-form-grid">
                    <div className="profile-input-group">
                      <label htmlFor="profile-name">{t('profile.field.fullName')}</label>
                      <input
                        type="text"
                        id="profile-name"
                        value={profileData.fullname}
                        onChange={(e) => setProfileData(prev => ({ ...prev, fullname: e.target.value }))}
                        required
                        readOnly={userRole === 'student'}
                        disabled={userRole !== 'student' && !isEditing}
                      />
                    </div>
                    {userRole === 'student' && (
                      <div className="profile-input-group">
                        <label htmlFor="profile-student-id">{t('profile.field.studentId')}</label>
                        <input
                          type="text"
                          id="profile-student-id"
                          value={studentId || '—'}
                          readOnly
                          placeholder={t('profile.field.studentIdPlaceholder')}
                          title={t('profile.field.studentIdTitle')}
                        />
                      </div>
                    )}
                    {userRole === 'student' && (
                      <div className="profile-input-group">
                        <label htmlFor="profile-course">{t('profile.field.course')}</label>
                        <input
                          type="text"
                          id="profile-course"
                          value={profileData.course}
                          readOnly
                        />
                      </div>
                    )}
                    <div className="profile-input-group">
                      <label htmlFor="profile-email">{t('profile.field.email')}</label>
                      <input type="email" id="profile-email" value={profileData.email} readOnly />
                    </div>
                    <div className="profile-input-group">
                      <label htmlFor="user-phone">{t('profile.field.phone')}</label>
                      <input
                        type="tel"
                        id="user-phone"
                        placeholder={t('profile.field.phonePlaceholder')}
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    {userRole === 'student' && (
                      <div className="profile-input-group profile-form-grid-full">
                        <label htmlFor="profile-campus">{t('profile.field.campus')}</label>
                        <input type="text" id="profile-campus" value={profileData.campus} readOnly />
                      </div>
                    )}
                  </div>

                  <div className={`profile-extra-section${embedded ? ' ctsv-profile-extra' : ''}`}>
                    <div className="profile-input-group profile-form-grid-full">
                      <label htmlFor="user-orientation">{t('profile.field.orientation')}</label>
                      <textarea
                        id="user-orientation"
                        placeholder={t('profile.field.orientationPlaceholder')}
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                        disabled={!isEditing}
                      ></textarea>
                    </div>

                    <div className={`interest-section${embedded ? ' ctsv-profile-interests' : ''}`}>
                      <div className="interest-title-wrapper">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span>
                          {isCtsvEmbedded
                            ? t('profile.interests.titleCtsv')
                            : t('profile.interests.titleStudent')}
                        </span>
                      </div>

                      <div className="interest-tag-list">
                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="hardware"
                            checked={interests.hardware}
                            onChange={(e) => handleInterestChange(e, 'hardware', INTEREST_STORAGE.hardware)}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>{t('profile.interest.hardware')}</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="ai"
                            checked={interests.ai}
                            onChange={(e) => handleInterestChange(e, 'ai', INTEREST_STORAGE.ai)}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>{t('profile.interest.ai')}</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="japan"
                            checked={interests.japan}
                            onChange={(e) => handleInterestChange(e, 'japan', INTEREST_STORAGE.japan)}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>{t('profile.interest.japan')}</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="charity"
                            checked={interests.charity}
                            onChange={(e) => handleInterestChange(e, 'charity', INTEREST_STORAGE.charity)}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>{t('profile.interest.charity')}</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="sports"
                            checked={interests.sports}
                            onChange={(e) => handleInterestChange(e, 'sports', INTEREST_STORAGE.sports)}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>{t('profile.interest.sports')}</span>
                          </div>
                        </label>

                        <label className={`interest-tag-checkbox ${!isEditing ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            name="interests"
                            value="music"
                            checked={interests.music}
                            onChange={(e) => handleInterestChange(e, 'music', INTEREST_STORAGE.music)}
                            disabled={!isEditing}
                          />
                          <div className="interest-tag-content">
                            <svg className="interest-tag-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>{t('profile.interest.music')}</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className={`profile-form-actions${embedded ? ' ctsv-profile-actions' : ''}`}>
                    {!isEditing ? (
                      <button
                        type="button"
                        className="primary-button btn-save-profile"
                        onClick={startEditing}
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        {t('profile.edit')}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
                        <button
                          type="submit"
                          id="save-btn"
                          className="primary-button btn-save-profile"
                          disabled={saveLoading}
                          style={{ flex: 1, margin: 0 }}
                        >
                          {saveLoading ? (
                            <span className="btn-spinner"></span>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                              </svg>
                              <span className="btn-text">{t('profile.save')}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={cancelEditing}
                          disabled={saveLoading}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'var(--transition-fast)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.color = 'var(--text-main)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.color = '#475569';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          {t('profile.cancel')}
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
          </form>

          {!profileLoading && (
            <ProfilePasswordSection
              showToast={showToast}
              description={passwordDescription}
              idPrefix={isAdminEmbedded ? 'admin' : isCtsvEmbedded ? 'ctsv' : 'student'}
            />
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );

  // ============================================================
  // Render
  // ============================================================

  const avatarCropModal = (
    <AvatarCropModal
      open={avatarCropOpen}
      imageSrc={avatarCropSrc}
      fileName={avatarCropFileName}
      onConfirm={handleAvatarCropConfirm}
      onCancel={handleAvatarCropCancel}
    />
  );

  if (embedded) {
    return (
      <>
        <div className="ctsv-page ctsv-profile-page">
          <header className="ctsv-profile-hero">
            <div className="ctsv-profile-hero-text">
              <span className="ctsv-profile-eyebrow">
                {isAdminEmbedded ? t('admin.profile.eyebrow') : t('admin.profile.staffEyebrow')}
              </span>
              <h1>{profilePageTitle}</h1>
              <p>
                {isAdminEmbedded
                  ? t('admin.profile.subtitle')
                  : t('admin.profile.staffSubtitle')}
              </p>
            </div>
          </header>
          {profileContent}
        </div>
        {avatarCropModal}
      </>
    );
  }

  return (
    <>
    <div className="dashboard-body">
      <div
        className={`sidebar-overlay ${sidebarActive ? 'active' : ''}`}
        id="sidebar-overlay"
        onClick={() => setSidebarActive(false)}
      />

      <div className="dashboard-container">
        <aside className={`sidebar-aside ${sidebarActive ? 'active' : ''}`} id="sidebar">
          {/* Logo */}
          <div
            className="sidebar-logo"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          >
            <img src={FE_LOGO} alt={FE_LOGO_ALT} />
          </div>

          {/* User Profile Card */}
          <a href="#" className="sidebar-user-card" onClick={(e) => e.preventDefault()}>
            {profileLoading ? (
              <div className="sidebar-avatar profile-skeleton profile-skeleton--avatar" aria-hidden="true" />
            ) : (
              <img className="sidebar-avatar" src={displayAvatar} alt="User Avatar" />
            )}
            <div className="sidebar-user-info">
              {profileLoading ? (
                <span className="profile-skeleton profile-skeleton--name" />
              ) : (
                <>
                  <span className="sidebar-user-name">{profileData.fullname}</span>
                  {userRole?.toLowerCase() !== 'student' && (
                    <span className="sidebar-user-role">{getRoleLabel(userRole)}</span>
                  )}
                </>
              )}
            </div>
          </a>

          <DashboardSidebarNav
            activeMenu="profile"
            onScanClick={handleScanClick}
            onCloseSidebar={() => setSidebarActive(false)}
            onProfileMenuItem={(key, event) => {
              if (key === 'profile') handleNavigateProfile(event);
            }}
            onNavigate={(path) => navigate(path)}
          />

          {/* Logout */}
          <div className="sidebar-footer">
            <a href="#" className="btn-logout" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>{t('profile.nav.logout')}</span>
            </a>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="top-navbar">
            <div className="navbar-left">
              <button
                className="btn-mobile-menu-toggle"
                id="menu-toggle"
                aria-label={t('profile.nav.openMenu')}
                onClick={() => setSidebarActive(true)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <div className="breadcrumbs">
                <Link to="/">{t('profile.breadcrumb.home')}</Link>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span className="current">{profilePageTitle}</span>
              </div>
            </div>

            <div className="navbar-right">
              {/* User Dropdown Menu link */}
              <a href="#" className="navbar-user-menu" onClick={(e) => e.preventDefault()}>
                {profileLoading ? (
                  <div className="navbar-user-avatar profile-skeleton profile-skeleton--avatar" aria-hidden="true" />
                ) : (
                  <img className="navbar-user-avatar" src={displayAvatar} alt="User Profile" />
                )}
                <div className="navbar-user-details">
                  {profileLoading ? (
                    <span className="profile-skeleton profile-skeleton--name" />
                  ) : (
                    <>
                      <span className="navbar-user-name">{profileData.fullname}</span>
                      {userRole?.toLowerCase() !== 'student' && (
                        <span className="navbar-user-role">{getRoleLabel(userRole)}</span>
                      )}
                    </>
                  )}
                </div>
              </a>
            </div>
          </header>

          {profileContent}

          {/* Dashboard Footer */}
          <footer className="dashboard-footer">
            <div className="dashboard-footer-content">
              <div className="footer-top">
                <div className="footer-info">
                  <a href="#" className="footer-logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                    <img
                      src={FE_LOGO}
                      alt={FE_LOGO_ALT}
                      style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                    />
                  </a>
                  <p>Nền tảng quản lý sự kiện chuyên nghiệp và sáng tạo dành riêng cho hệ sinh thái FPT.</p>
                </div>

                <div className="footer-column">
                  <h3>Khám phá</h3>
                  <ul className="footer-links">
                    <li><a href="#" onClick={handleSidebarNavigate('/events')}>Sự kiện sắp tới</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/events')}>Câu lạc bộ nổi bật</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/my-events')}>Thư viện hình ảnh</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h3>Hỗ trợ</h3>
                  <ul className="footer-links">
                    <li><a href="#" onClick={handleSidebarNavigate('/support')}>Trung tâm hỗ trợ</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/contact')}>Liên hệ chúng tôi</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/terms')}>Điều khoản dịch vụ</a></li>
                    <li><a href="#" onClick={handleSidebarNavigate('/privacy')}>Chính sách bảo mật</a></li>
                  </ul>
                </div>

                <div className="footer-column">
                  <h3>Kết nối</h3>
                  <div className="social-links">
                    <a href="#" className="social-link" aria-label="Facebook" onClick={(e) => handleFeatureNotImplemented(e, 'Facebook')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </a>
                    <a href="#" className="social-link" aria-label="Instagram" onClick={(e) => handleFeatureNotImplemented(e, 'Instagram')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <div className="footer-bottom">
                <span className="copyright-text">© 2024 FPT Event Platform. All rights reserved.</span>
                <div className="footer-bottom-links">
                  <a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Báo cáo')}>Báo cáo</a>
                  <a href="#" onClick={(e) => handleFeatureNotImplemented(e, 'Cookie Policy')}>Cookie Policy</a>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
    {avatarCropModal}
    </>
  );
};

export default Profile;
