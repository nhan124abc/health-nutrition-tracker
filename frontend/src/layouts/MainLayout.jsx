import { useEffect, useRef, useState } from 'react';
import { Button, Container, Form, InputGroup, Modal, Nav, Navbar, Offcanvas } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaChartLine,
  FaDumbbell,
  FaHome,
  FaPaperPlane,
  FaRobot,
  FaSearch,
  FaSignOutAlt,
  FaTint,
  FaUserCircle,
  FaUtensils,
  FaWeight,
  FaBullseye,
} from 'react-icons/fa';
import { logout } from '../api/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { clearChatHistory, getChatHistory, sendChatMessage } from '../features/ai/aiService';

const menuItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: FaHome },
  { to: '/goals', labelKey: 'nav.goals', icon: FaBullseye },
  { to: '/planner', labelKey: 'nav.planner', icon: FaRobot },
  { to: '/meals', labelKey: 'nav.diary', icon: FaUtensils },
  { to: '/water', labelKey: 'nav.water', icon: FaTint },
  { to: '/activity', labelKey: 'nav.activity', icon: FaDumbbell },
  { to: '/nutrition', labelKey: 'nav.nutrition', icon: FaSearch },
  { to: '/reports', labelKey: 'nav.statistics', icon: FaChartLine },
  { to: '/body-metrics', labelKey: 'nav.bodyMetrics', icon: FaWeight },
  { to: '/profile', labelKey: 'nav.profile', icon: FaUserCircle },
];

function MainLayout() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const aiChatWindowRef = useRef(null);

  useEffect(() => {
    setShowMobileSidebar(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!showAiChat) {
      return;
    }

    let isActive = true;
    setAiHistoryLoading(true);
    setAiError('');

    getChatHistory()
      .then((response) => {
        if (!isActive) {
          return;
        }

        setAiMessages(
          (response.data || []).map((message) => ({
            role: message.role,
            content: message.content,
          }))
        );
      })
      .catch((err) => {
        if (isActive) {
          setAiError(err.response?.data?.message || t('header.aiHistoryError'));
        }
      })
      .finally(() => {
        if (isActive) {
          setAiHistoryLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [showAiChat, t]);

  useEffect(() => {
    if (!showAiChat || !aiChatWindowRef.current) {
      return;
    }

    aiChatWindowRef.current.scrollTop = aiChatWindowRef.current.scrollHeight;
  }, [showAiChat, aiMessages, aiLoading, aiHistoryLoading]);

  const handleMenuClick = () => {
    if (window.innerWidth < 992) {
      setShowMobileSidebar(true);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAiSubmit = async (event) => {
    event.preventDefault();
    const message = aiMessage.trim();

    if (!message || aiLoading) {
      return;
    }

    setAiMessage('');
    setAiError('');
    setAiLoading(true);

    const userMessage = { role: 'user', content: message };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const response = await sendChatMessage({
        message,
        context: `Current route: ${location.pathname}`,
      });

      setAiMessages((current) => [
        ...current,
        { role: 'assistant', content: response.data?.reply || '' },
      ]);
    } catch (err) {
      setAiError(err.response?.data?.message || t('header.aiError'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearAiHistory = async () => {
    if (aiLoading || aiHistoryLoading) {
      return;
    }

    setAiError('');

    try {
      await clearChatHistory();
      setAiMessages([]);
    } catch (err) {
      setAiError(err.response?.data?.message || t('header.aiClearError'));
    }
  };

  const renderSidebarNav = () => (
    <Nav className="layout-sidebar-nav flex-column">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const label = t(item.labelKey);

        return (
          <Nav.Link
            as={NavLink}
            to={item.to}
            end={item.to === '/dashboard'}
            key={item.to}
            className="layout-sidebar-link"
            aria-label={label}
          >
            <Icon className="layout-sidebar-icon" />
            <span className="layout-sidebar-label">{label}</span>
          </Nav.Link>
        );
      })}
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
            <Button
              type="button"
              variant="light"
              className="layout-user-toggle"
              onClick={() => setShowAiChat(true)}
              aria-label={t('header.aiLabel')}
              title={t('header.aiLabel')}
            >
              <FaRobot />
            </Button>
            <LanguageSwitcher />
            <NavLink to="/profile" className="btn btn-light layout-user-toggle" aria-label={t('nav.profile')}>
              <FaUserCircle />
            </NavLink>
            <button type="button" className="btn btn-light layout-user-toggle" onClick={handleLogout} aria-label={t('nav.logout')}>
              <FaSignOutAlt />
            </button>
          </div>
        </Container>
      </Navbar>

      <aside className="layout-sidebar d-none d-lg-flex">
        <NavLink to="/dashboard" className="layout-sidebar-brand">
          <img
            src="/img/Logo.jpg"
            alt={t('app.name')}
            className="layout-sidebar-logo"
          />
          <span className="layout-sidebar-brand-text">{t('app.name')}</span>
        </NavLink>
        <div className="layout-sidebar-title">{t('sidebar.title')}</div>
        {renderSidebarNav()}
      </aside>

      <Offcanvas show={showMobileSidebar} onHide={() => setShowMobileSidebar(false)} className="layout-mobile-sidebar">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{t('app.name')}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderSidebarNav()}</Offcanvas.Body>
      </Offcanvas>

      <div className="layout-main">
        <main className="layout-content">
          <Container fluid>
            <div className="route-transition" key={location.pathname}>
              <Outlet />
            </div>
          </Container>
        </main>
      </div>

      <Modal show={showAiChat} onHide={() => setShowAiChat(false)} centered className="ai-chat-modal">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaRobot className="text-success" />
            {t('header.aiTitle')}
          </Modal.Title>
          {aiMessages.length > 0 && (
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              className="ms-auto me-3"
              onClick={handleClearAiHistory}
              disabled={aiLoading || aiHistoryLoading}
            >
              {t('header.aiClear')}
            </Button>
          )}
        </Modal.Header>
        <Modal.Body>
          <div className="ai-chat-window" ref={aiChatWindowRef}>
            <div className="ai-message ai-message-assistant">
              {t('header.aiWelcome')}
            </div>
            {aiHistoryLoading && (
              <div className="ai-message ai-message-assistant">
                {t('header.aiLoadingHistory')}
              </div>
            )}
            {aiMessages.map((message, index) => (
              <div className={`ai-message ai-message-${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {aiLoading && (
              <div className="ai-message ai-message-assistant">
                {t('header.aiThinking')}
              </div>
            )}
          </div>
          {aiError && <div className="text-danger small mt-2">{aiError}</div>}
          <Form className="ai-chat-form mt-3" onSubmit={handleAiSubmit}>
            <InputGroup>
              <Form.Control
                value={aiMessage}
                onChange={(event) => setAiMessage(event.target.value)}
                placeholder={t('header.aiPlaceholder')}
                aria-label={t('header.aiLabel')}
                disabled={aiLoading}
              />
              <Button variant="success" type="submit" aria-label={t('header.aiSend')} disabled={aiLoading}>
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
