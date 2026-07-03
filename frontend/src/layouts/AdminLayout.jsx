import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Container,
  Modal,
  Nav,
  Navbar,
  Offcanvas,
  Overlay,
  OverlayTrigger,
  Popover,
  Tooltip,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaDumbbell,
  FaFolderOpen,
  FaHome,
  FaSignOutAlt,
  FaUserCircle,
  FaUsers,
  FaUtensils,
} from 'react-icons/fa';
import { getCurrentUser, logout } from '../api/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getStoredProfileAvatar } from '../features/profile/profileUtils';

const adminMenuItems = [
  { to: '/admin/dashboard', labelKey: 'admin.nav.dashboard', icon: FaHome },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: FaUsers },
  { to: '/admin/catalogs', labelKey: 'admin.nav.catalogs', icon: FaFolderOpen },
  { to: '/admin/all-foods', labelKey: 'admin.nav.manageFoods', icon: FaUtensils },
  { to: '/admin/all-activities', labelKey: 'admin.nav.manageActivities', icon: FaDumbbell },
  { to: '/admin/profile', labelKey: 'admin.nav.profile', icon: FaUserCircle },
];

function getAdminAvatar(account) {
  return account?.avatarUrl || getStoredProfileAvatar(account);
}

function withImageCacheBust(url, version) {
  if (!url) {
    return '';
  }
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

function AdminLayout() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('adminSidebarCollapsed') === 'true'
  );
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [adminAvatarUrl, setAdminAvatarUrl] = useState(() => getAdminAvatar(getCurrentUser()));
  const [adminAvatarFailed, setAdminAvatarFailed] = useState(false);
  const [adminAvatarVersion, setAdminAvatarVersion] = useState(Date.now());
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userButtonRef = useRef(null);

  useEffect(() => {
    const account = getCurrentUser();
    setShowSidebar(false);
    setShowUserPopover(false);
    setCurrentUser(account);
    setAdminAvatarUrl(getAdminAvatar(account));
    setAdminAvatarVersion(Date.now());
    setAdminAvatarFailed(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleAdminAvatarUpdated = (event) => {
      setAdminAvatarUrl(event.detail?.avatarUrl || '');
      setAdminAvatarVersion(Date.now());
      setAdminAvatarFailed(false);
    };

    window.addEventListener('admin:avatarUpdated', handleAdminAvatarUpdated);

    return () => {
      window.removeEventListener('admin:avatarUpdated', handleAdminAvatarUpdated);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      const account = event.detail || getCurrentUser();
      setCurrentUser(account);
      setAdminAvatarUrl(getAdminAvatar(account));
      setAdminAvatarVersion(Date.now());
      setAdminAvatarFailed(false);
    };

    window.addEventListener('admin:profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('admin:profile-updated', handleProfileUpdated);
  }, []);

  const handleMenuClick = () => {
    if (window.innerWidth < 992) {
      setShowSidebar(true);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  };

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };

  const renderNavLink = (item, collapsed = false) => {
    const Icon = item.icon;
    const label = t(item.labelKey);
    const link = (
      <Nav.Link key={item.to} as={NavLink} to={item.to} className="admin-sidebar-link" aria-label={label}>
        <Icon className="admin-sidebar-icon" />
        <span className="admin-sidebar-label">{label}</span>
      </Nav.Link>
    );

    if (!collapsed) {
      return link;
    }

    return (
      <OverlayTrigger key={item.to} placement="right" overlay={<Tooltip id={`admin-tooltip-${item.to}`}>{label}</Tooltip>}>
        <div>{link}</div>
      </OverlayTrigger>
    );
  };

  const renderNav = (collapsed = false) => (
    <Nav className="admin-sidebar-nav flex-column">
      {adminMenuItems.map((item) => renderNavLink(item, collapsed))}
    </Nav>
  );

  return (
    <div className={`admin-shell ${isSidebarCollapsed ? 'admin-sidebar-collapsed' : ''}`}>
      <aside className="admin-sidebar d-none d-lg-flex">
        <NavLink to="/admin/dashboard" className="admin-brand">
          <img src="/img/Logo.jpg" alt={t('admin.layout.logoAlt')} />
          <span className="admin-brand-text">{t('admin.layout.brand')}</span>
        </NavLink>
        {renderNav(isSidebarCollapsed)}
      </aside>

      <Navbar bg="white" className="admin-header border-bottom" sticky="top">
        <Container fluid className="admin-header-inner">
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="link"
              className="admin-icon-button"
              onClick={handleMenuClick}
              aria-label={t('admin.layout.toggleSidebar')}
            >
              <FaBars />
            </Button>
            <span className="layout-header-title">{t('admin.layout.brand')}</span>
          </div>

          <div className="admin-header-actions">
            <LanguageSwitcher />
            <button
              type="button"
              ref={userButtonRef}
              className={`btn btn-light layout-user-toggle${adminAvatarUrl && !adminAvatarFailed ? ' layout-user-avatar-toggle' : ''}`}
              onClick={() => setShowUserPopover((current) => !current)}
              aria-label={t('admin.nav.profile')}
              title={t('admin.nav.profile')}
            >
              {adminAvatarUrl && !adminAvatarFailed ? (
                <img
                  src={withImageCacheBust(adminAvatarUrl, adminAvatarVersion)}
                  alt={t('admin.nav.profile')}
                  onError={() => setAdminAvatarFailed(true)}
                />
              ) : (
                <FaUserCircle />
              )}
            </button>
            <button
              type="button"
              className="btn btn-light layout-user-toggle"
              onClick={requestLogout}
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
            >
              <FaSignOutAlt />
            </button>
            <Overlay
              target={userButtonRef.current}
              show={showUserPopover}
              placement="bottom-end"
              rootClose
              onHide={() => setShowUserPopover(false)}
            >
              <Popover id="admin-user-popover" className="profile-summary-popover">
                <Popover.Body>
                  <div className="profile-summary-mini">
                    <div>
                      <span>{t('profilePage.fields.username')}</span>
                      <strong>{currentUser?.username || currentUser?.fullName || currentUser?.name || '-'}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{currentUser?.email || '-'}</strong>
                    </div>
                  </div>
                </Popover.Body>
              </Popover>
            </Overlay>
          </div>
        </Container>
      </Navbar>

      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} className="admin-mobile-sidebar">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{t('admin.layout.brand')}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderNav(false)}</Offcanvas.Body>
      </Offcanvas>

      <main className="admin-main">
        <Container fluid>
          <div className="route-transition" key={location.pathname}>
            <Outlet />
          </div>
        </Container>
      </main>

      <Modal show={showLogoutConfirm} onHide={() => setShowLogoutConfirm(false)} centered className="logout-confirm-modal">
        <Modal.Header closeButton className="logout-confirm-header">
          <div className="logout-confirm-icon">
            <FaSignOutAlt />
          </div>
          <Modal.Title>{t('nav.logoutConfirmTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="logout-confirm-body">
          {t('nav.logoutConfirmMessage')}
        </Modal.Body>
        <Modal.Footer className="logout-confirm-footer">
          <Button variant="outline-secondary" className="logout-confirm-cancel" onClick={() => setShowLogoutConfirm(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" className="logout-confirm-submit" onClick={handleLogout}>
            {t('nav.logout')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminLayout;
