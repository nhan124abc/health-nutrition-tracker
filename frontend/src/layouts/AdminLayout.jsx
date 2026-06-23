import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Container,
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
  FaBell,
  FaChartLine,
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

const adminMenuItems = [
  { to: '/admin/dashboard', labelKey: 'admin.nav.dashboard', icon: FaHome },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: FaUsers },
  { to: '/admin/catalogs', labelKey: 'admin.nav.catalogs', icon: FaFolderOpen },
  { to: '/admin/all-foods', labelKey: 'admin.nav.manageFoods', icon: FaUtensils },
  { to: '/admin/all-activities', labelKey: 'admin.nav.manageActivities', icon: FaDumbbell },
  { to: '/admin/analytics', labelKey: 'admin.nav.analytics', icon: FaChartLine },
  { to: '/admin/profile', labelKey: 'admin.nav.profile', icon: FaUserCircle },
];

function AdminLayout() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('adminSidebarCollapsed') === 'true'
  );
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userButtonRef = useRef(null);

  useEffect(() => {
    setShowSidebar(false);
    setShowUserPopover(false);
    setCurrentUser(getCurrentUser());
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      setCurrentUser(event.detail || getCurrentUser());
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

  const handleLogout = async () => {
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
            <Button variant="link" className="admin-icon-button" aria-label={t('admin.layout.notifications')}>
              <FaBell />
            </Button>
            <LanguageSwitcher />
            <button
              type="button"
              ref={userButtonRef}
              className={`btn btn-light layout-user-toggle${currentUser?.avatarUrl ? ' layout-user-avatar-toggle' : ''}`}
              onClick={() => setShowUserPopover((current) => !current)}
              aria-label={t('admin.nav.profile')}
              title={t('admin.nav.profile')}
            >
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={t('admin.nav.profile')} />
              ) : (
                <FaUserCircle />
              )}
            </button>
            <button
              type="button"
              className="btn btn-light layout-user-toggle"
              onClick={handleLogout}
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
    </div>
  );
}

export default AdminLayout;
