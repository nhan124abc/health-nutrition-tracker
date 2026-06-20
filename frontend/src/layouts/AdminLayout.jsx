import { useEffect, useRef, useState } from 'react';
import {
  Badge,
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
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FaBars,
  FaBell,
  FaChartLine,
  FaChevronDown,
  FaChevronRight,
  FaDumbbell,
  FaFolderOpen,
  FaHome,
  FaShieldAlt,
  FaUserCircle,
  FaUsers,
  FaUtensils,
} from 'react-icons/fa';
import { getCurrentUser } from '../api/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

const adminMenuItems = [
  { to: '/admin/dashboard', labelKey: 'admin.nav.dashboard', icon: FaHome },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: FaUsers },
  {
    labelKey: 'admin.nav.catalogs',
    icon: FaFolderOpen,
    children: [
      { to: '/admin/catalogs/foods', labelKey: 'admin.nav.foodCatalog', icon: FaUtensils },
      { to: '/admin/catalogs/activities', labelKey: 'admin.nav.activityCatalog', icon: FaDumbbell },
    ],
  },
  { to: '/admin/analytics', labelKey: 'admin.nav.analytics', icon: FaChartLine },
  { to: '/admin/profile', labelKey: 'admin.nav.profile', icon: FaUserCircle },
];

function AdminLayout() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('adminSidebarCollapsed') === 'true'
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(
    () => window.location.pathname.startsWith('/admin/catalogs')
  );
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const location = useLocation();
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

  const handleMenuClick = () => {
    if (window.innerWidth < 992) {
      setShowSidebar(true);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
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
      {adminMenuItems.map((item) => {
        if (!item.children) {
          return renderNavLink(item, collapsed);
        }

        const Icon = item.icon;
        const label = t(item.labelKey);
        const isActive = location.pathname.startsWith('/admin/catalogs');

        if (collapsed) {
          return item.children.map((child) => renderNavLink(child, true));
        }

        return (
          <div className="admin-sidebar-group" key={item.labelKey}>
            <button
              type="button"
              className={`admin-sidebar-link admin-sidebar-group-toggle${isActive ? ' active' : ''}`}
              onClick={() => setIsCatalogOpen((current) => !current)}
              aria-expanded={isCatalogOpen}
            >
              <Icon className="admin-sidebar-icon" />
              <span className="admin-sidebar-label">{label}</span>
              {isCatalogOpen ? <FaChevronDown className="admin-sidebar-chevron" /> : <FaChevronRight className="admin-sidebar-chevron" />}
            </button>
            {isCatalogOpen && (
              <div className="admin-sidebar-submenu">
                {item.children.map((child) => renderNavLink(child, false))}
              </div>
            )}
          </div>
        );
      })}
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
              className="btn btn-light layout-user-toggle"
              onClick={() => setShowUserPopover((current) => !current)}
              aria-label={t('admin.nav.profile')}
              title={t('admin.nav.profile')}
            >
              <FaUserCircle />
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
