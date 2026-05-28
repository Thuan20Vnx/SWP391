import { Link, useNavigate } from 'react-router-dom';
import SettingsPanel from '../components/settings/SettingsPanel';

const Settings = ({ showToast }) => {
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <header className="home-header settings-page__header">
        <div className="header-container settings-page__header-inner">
          <div className="settings-page__header-left">
            <button
              type="button"
              className="settings-page__back"
              onClick={() => navigate(-1)}
              aria-label="Quay lại"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Quay lại</span>
            </button>

            <div className="header-logo" onClick={() => navigate('/')}>
              <img
                src="https://lh3.googleusercontent.com/d/1zQNsDmGHl1ho4Xk8SN6dOPXSQVQQbhWM"
                alt="F Events Logo"
                className="logo-img"
              />
            </div>
          </div>

          <nav className="header-nav settings-page__nav">
            <Link to="/" className="nav-link">Trang chủ</Link>
            <Link to="/events" className="nav-link">Sự kiện</Link>
            <Link to="/profile" className="nav-link">Hồ sơ</Link>
          </nav>
        </div>
      </header>

      <div className="settings-page__body">
        <div className="settings-page__intro">
          <h1>Cài đặt</h1>
          <p>Quản lý bảo mật, thông báo và trải nghiệm sử dụng F-Events.</p>
        </div>

        <div className="settings-page__shell">
          <SettingsPanel showToast={showToast} />
        </div>
      </div>
    </div>
  );
};

export default Settings;
