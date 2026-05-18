import { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Dropdown,
  Form,
  InputGroup,
  Modal,
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
  FaBullseye,
  FaChartBar,
  FaCog,
  FaHome,
  FaNewspaper,
  FaPaperPlane,
  FaRobot,
  FaRunning,
  FaSearch,
  FaSignOutAlt,
  FaTint,
  FaUserCircle,
  FaUtensils,
} from 'react-icons/fa';
import LanguageSwitcher from '../components/LanguageSwitcher';

const menuItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: FaHome },
  { to: '/nutrition', labelKey: 'nav.nutrition', icon: FaUtensils },
  { to: '/activity', labelKey: 'nav.activity', icon: FaRunning },
  { to: '/water', labelKey: 'nav.water', icon: FaTint },
  { to: '/goals', labelKey: 'nav.goals', icon: FaBullseye },
  { to: '/reports', labelKey: 'nav.reports', icon: FaChartBar },
  { to: '/news', labelKey: 'nav.news', icon: FaNewspaper },
  { to: '/settings', labelKey: 'nav.settings', icon: FaCog },
];

function MainLayout() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [showAiChat, setShowAiChat] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setShowMobileSidebar(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleMenuClick = () => {
    if (window.innerWidth < 992) {
      setShowMobileSidebar(true);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
  };

  const handleAiSubmit = (event) => {
    event.preventDefault();
    setAiMessage('');
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    navigate('/login');
  };

  const renderSidebarLink = (item, collapsed = false) => {
    const Icon = item.icon;
    const link = (
      <Nav.Link
        as={NavLink}
        to={item.to}
        end={item.to === '/dashboard'}
        key={item.to}
        className="layout-sidebar-link"
        aria-label={t(item.labelKey)}
      >
        <Icon className="layout-sidebar-icon" />
        <span className="layout-sidebar-label">{t(item.labelKey)}</span>
      </Nav.Link>
    );

    if (!collapsed) {
      return link;
    }

    return (
      <OverlayTrigger
        key={item.to}
        placement="right"
        overlay={<Tooltip id={`tooltip-${item.to.replace('/', '')}`}>{t(item.labelKey)}</Tooltip>}
      >
        <div>{link}</div>
      </OverlayTrigger>
    );
  };

  const renderSidebarNav = (collapsed = false) => (
    <Nav className="layout-sidebar-nav flex-column">
      {menuItems.map((item) => renderSidebarLink(item, collapsed))}
    </Nav>
  );

  return (
    <div className={`app-shell layout-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Navbar bg="white" className="layout-header border-bottom" sticky="top">
        <Container fluid className="layout-header-container">
          <div className="layout-header-left">
            <button
              type="button"
              className="btn btn-link layout-menu-button"
              onClick={handleMenuClick}
              aria-label={t('header.toggleSidebar')}
            >
              <FaBars />
            </button>
            <span className="layout-header-title">{t('app.name')}</span>
          </div>

          <div className="layout-header-actions">
            <Form className="layout-search-form d-none d-md-block" onSubmit={handleSearchSubmit}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('header.searchPlaceholder')}
                  aria-label={t('header.searchLabel')}
                />
              </InputGroup>
            </Form>
            <Button
              type="button"
              variant="outline-success"
              className="layout-ai-button"
              onClick={() => setShowAiChat(true)}
              aria-label={t('header.aiLabel')}
              title={t('header.aiLabel')}
            >
              <FaRobot />
            </Button>
            <LanguageSwitcher />
            <Dropdown align="end">
              <Dropdown.Toggle variant="light" className="layout-user-toggle" id="user-menu">
                <FaUserCircle />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item as={NavLink} to="/profile">
                  {t('user.profile')}
                </Dropdown.Item>
                <Dropdown.Item as={NavLink} to="/settings">
                  {t('user.settings')}
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

      <aside className="layout-sidebar d-none d-lg-flex">
        <NavLink to="/dashboard" className="layout-sidebar-brand">
          <img src="/logo192.png" alt={t('app.name')} className="layout-sidebar-logo" />
          <span className="layout-sidebar-brand-text">{t('app.name')}</span>
        </NavLink>
        <div className="layout-sidebar-title">{t('sidebar.title')}</div>
        {renderSidebarNav(isSidebarCollapsed)}
      </aside>

      <Offcanvas show={showMobileSidebar} onHide={() => setShowMobileSidebar(false)} className="layout-mobile-sidebar">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <img src="/logo192.png" alt={t('app.name')} className="layout-logo me-2" />
            {t('app.name')}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderSidebarNav(false)}</Offcanvas.Body>
      </Offcanvas>

      <div className="layout-main">
        <main className="layout-content">
          <Container fluid>
            <Outlet />
          </Container>
        </main>

        <footer className="layout-footer">
          <Container fluid className="d-flex">
            <span className='ms-auto text-end'>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          </Container>
        </footer>
      </div>

      <Modal show={showAiChat} onHide={() => setShowAiChat(false)} centered className="ai-chat-modal">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaRobot className="text-success" />
            {t('header.aiTitle')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="ai-chat-window">
            <div className="ai-message ai-message-assistant">{t('header.aiWelcome')}</div>
          </div>
          <Form className="ai-chat-form mt-3" onSubmit={handleAiSubmit}>
            <InputGroup>
              <Form.Control
                value={aiMessage}
                onChange={(event) => setAiMessage(event.target.value)}
                placeholder={t('header.aiPlaceholder')}
                aria-label={t('header.aiLabel')}
              />
              <Button variant="success" type="submit" aria-label={t('header.aiSend')}>
                <FaPaperPlane />
              </Button>
            </InputGroup>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default MainLayout;
