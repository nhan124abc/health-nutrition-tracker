import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Container,
  Dropdown,
  Form,
  InputGroup,
  Nav,
  Navbar,
  Offcanvas,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaBell,
  FaChartLine,
  FaChevronDown,
  FaChevronRight,
  FaDumbbell,
  FaFolderOpen,
  FaHome,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaUsers,
  FaUtensils,
} from 'react-icons/fa';
import { logout } from '../api/api';
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
];

function AdminLayout() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('adminSidebarCollapsed') === 'true'
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(
    () => window.location.pathname.startsWith('/admin/catalogs')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setShowSidebar(false);
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
        <div className="admin-sidebar-caption">
          <FaShieldAlt />
          <span>{t('admin.layout.sidebarCaption')}</span>
        </div>
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
            <div>
              <Badge bg="success" className="mb-1">
                {t('admin.layout.badge')}
              </Badge>
              <h1 className="admin-header-title mb-0">{t('admin.layout.title')}</h1>
            </div>
          </div>

          <div className="admin-header-actions">
            <Form className="admin-search-form d-none d-md-block" onSubmit={(event) => event.preventDefault()}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('admin.layout.searchPlaceholder')}
                  aria-label={t('admin.layout.searchLabel')}
                />
              </InputGroup>
            </Form>
            <Button variant="link" className="admin-icon-button" aria-label={t('admin.layout.notifications')}>
              <FaBell />
            </Button>
            <LanguageSwitcher />
            <Dropdown align="end">
              <Dropdown.Toggle variant="light" className="layout-user-toggle" id="admin-user-menu">
                <FaUserCircle />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item as={NavLink} to="/dashboard">
                  {t('admin.layout.backToUser')}
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>
                  <FaSignOutAlt className="me-2" />
                  {t('nav.logout')}
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
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
