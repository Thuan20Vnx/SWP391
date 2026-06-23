import React from 'react';
import { Link } from 'react-router-dom';
import fptLogo from '../assets/fpt_logo.png';
import useUserProfile from '../hooks/useUserProfile';
import { getHomePathForRole, getUserRole, isAdminRole } from '../utils/auth';
import { useTranslation } from '../i18n/I18nContext';
import {
  FOOTER_CONTACT,
  FOOTER_EXPLORE_LINKS,
  FOOTER_POLICY_LINKS,
  FOOTER_SOCIAL_LINKS,
  FOOTER_SUPPORT_LINKS,
} from '../data/footerContent';

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const SiteFooter = () => {
  const { t } = useTranslation();
  const { isLoggedIn, userProfile } = useUserProfile();
  const role = userProfile.role || getUserRole();
  const isGuest = !isLoggedIn;
  const staffPortalRoles = ['ctsv', 'icpdp', 'partner', 'club_manager'];
  const isStudentLike = isLoggedIn && !isAdminRole(role) && !staffPortalRoles.includes(role);
  const portalHome = getHomePathForRole(role);
  const year = new Date().getFullYear();
  const contactEmail = isAdminRole(role) ? FOOTER_CONTACT.adminEmail : FOOTER_CONTACT.ctsvEmail;

  return (
    <footer className="home-footer">
      <div className="footer-top-columns">
        <div className="footer-branding-col">
          <Link to="/" className="footer-logo-link" onClick={scrollToTop}>
            <img src={fptLogo} alt="FPT Event Platform" className="footer-logo-img" />
          </Link>
          <p className="footer-brand-desc">{t('footer.desc')}</p>
          <ul className="footer-contact-list">
            <li>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </li>
            <li>
              <a href={`tel:${FOOTER_CONTACT.hotline.replace(/\s/g, '')}`}>{FOOTER_CONTACT.hotline}</a>
            </li>
            <li>{FOOTER_CONTACT.address}</li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4>{t('footer.explore')}</h4>
          <ul className="footer-links-list">
            {FOOTER_EXPLORE_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{t(item.labelKey)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-links-col">
          <h4>{t('footer.support')}</h4>
          <ul className="footer-links-list">
            {FOOTER_SUPPORT_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{t(item.labelKey)}</Link>
              </li>
            ))}
            <li>
              <span className="footer-chat-hint">{t('footer.chatHint')}</span>
            </li>
          </ul>
        </div>

        <div className="footer-links-col footer-account-col">
          <h4>{isGuest ? t('footer.forYou') : t('footer.account')}</h4>
          <ul className="footer-links-list">
            {isGuest && (
              <>
                <li>
                  <Link to="/login">{t('header.login')}</Link>
                </li>
                <li>
                  <Link to="/signup">{t('footer.link.signup')}</Link>
                </li>
                <li>
                  <Link to="/guide">{t('footer.link.guideEvents')}</Link>
                </li>
              </>
            )}
            {isStudentLike && (
              <>
                <li>
                  <Link to="/profile">{t('footer.link.profile')}</Link>
                </li>
                <li>
                  <Link to="/my-events">{t('footer.link.myEvents')}</Link>
                </li>
                <li>
                  <Link to="/settings">{t('footer.link.settings')}</Link>
                </li>
              </>
            )}
            {isLoggedIn && !isGuest && !isStudentLike && (
              <li>
                <Link to={portalHome}>{t('footer.link.portal')}</Link>
              </li>
            )}
          </ul>

          <h4 className="footer-subheading">{t('footer.connect')}</h4>
          <div className="social-icon-row">
            {FOOTER_SOCIAL_LINKS.map((social) => (
              <a
                key={social.id}
                href={social.href}
                className="social-icon-box"
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {social.id === 'facebook' && (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path
                      d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {social.id === 'instagram' && (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path
                      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
                      fill="currentColor"
                    />
                  </svg>
                )}
                {social.id === 'website' && (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom-row">
        <p className="copyright-text">{t('common.copyright', { year })}</p>
        <div className="footer-policy-links">
          {FOOTER_POLICY_LINKS.map((item) => (
            <Link key={item.to} to={item.to}>
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
        <button type="button" className="footer-back-top" onClick={scrollToTop}>
          {t('common.backToTop')}
        </button>
      </div>
    </footer>
  );
};

export default SiteFooter;
