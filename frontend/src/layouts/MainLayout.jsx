import { useEffect, useRef, useState } from 'react';
import { Button, Container, Form, InputGroup, Modal, Nav, Navbar, Offcanvas, Overlay, Popover } from 'react-bootstrap';
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
  FaCog,
  FaSignOutAlt,
  FaTint,
  FaUserCircle,
  FaUtensils,
  FaWeight,
  FaBullseye,
} from 'react-icons/fa';
import { getCurrentUser, logout } from '../api/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { clearChatHistory, getChatHistory, sendChatMessage } from '../features/ai/aiService';
import AuthTimeoutWatcher from '../features/auth/AuthTimeoutWatcher';
import { getProfile } from '../features/profile/profileService';
import ReminderNotifier from '../features/reminders/ReminderNotifier';
import {
  extractProfileFromApi,
  getMissingRequiredProfileFields,
  mergeProfileAvatar,
  mapProfileFromApi,
} from '../features/profile/profileUtils';

const SIDEBAR_DEFAULT_WIDTH = 264;
const SIDEBAR_MIN_WIDTH = 84;
const SIDEBAR_MAX_WIDTH = 340;
const SIDEBAR_COLLAPSE_THRESHOLD = 128;

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
  { to: '/settings', labelKey: 'nav.settings', icon: FaCog },
];

function MainLayout() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showProfileSummary, setShowProfileSummary] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [missingProfileFields, setMissingProfileFields] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const storedWidth = Number(localStorage.getItem('sidebarWidth'));

    if (!Number.isFinite(storedWidth) || storedWidth <= 0) {
      return SIDEBAR_DEFAULT_WIDTH;
    }

    return Math.min(Math.max(storedWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const aiChatWindowRef = useRef(null);
  const profileButtonRef = useRef(null);

  useEffect(() => {
    setShowMobileSidebar(false);
    setShowProfileSummary(false);
  }, [location.pathname]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, [location.pathname]);

  useEffect(() => {
    let isActive = true;

    getProfile()
      .then((response) => {
        if (!isActive) {
          return;
        }

        const profile = mergeProfileAvatar(
          mapProfileFromApi(extractProfileFromApi(response.data)),
          getCurrentUser()
        );
        const missingFields = getMissingRequiredProfileFields(profile);

        setCurrentProfile(profile);
        setMissingProfileFields(missingFields);
        setShowProfileRequiredModal(missingFields.length > 0 && location.pathname !== '/profile');
      })
      .catch(() => {
        if (isActive) {
          setCurrentProfile(null);
          setMissingProfileFields([]);
          setShowProfileRequiredModal(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      const profile = event.detail;
      const missingFields = getMissingRequiredProfileFields(profile);

      setCurrentProfile(profile);
      setMissingProfileFields(missingFields);
      setShowProfileRequiredModal(missingFields.length > 0 && location.pathname !== '/profile');
    };

    window.addEventListener('profile:updated', handleProfileUpdated);

    return () => {
      window.removeEventListener('profile:updated', handleProfileUpdated);
    };
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth));
  }, [sidebarWidth]);

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

    setIsSidebarCollapsed((current) => {
      if (current && sidebarWidth <= SIDEBAR_COLLAPSE_THRESHOLD) {
        setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
      }

      return !current;
    });
  };

  const handleSidebarResizeStart = (event) => {
    event.preventDefault();
    setIsSidebarCollapsed(false);

    const updateSidebarWidth = (clientX) => {
      const nextWidth = Math.min(Math.max(clientX, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);

      setSidebarWidth(nextWidth);
      setIsSidebarCollapsed(nextWidth <= SIDEBAR_COLLAPSE_THRESHOLD);
    };

    const handlePointerMove = (moveEvent) => {
      updateSidebarWidth(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      document.body.classList.remove('is-resizing-sidebar');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    document.body.classList.add('is-resizing-sidebar');
    updateSidebarWidth(event.clientX);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleSidebarResizeKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();

    setSidebarWidth((current) => {
      let nextWidth = current;

      if (event.key === 'ArrowLeft') {
        nextWidth = current - 16;
      } else if (event.key === 'ArrowRight') {
        nextWidth = current + 16;
      } else if (event.key === 'Home') {
        nextWidth = SIDEBAR_MIN_WIDTH;
      } else {
        nextWidth = SIDEBAR_MAX_WIDTH;
      }

      nextWidth = Math.min(Math.max(nextWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
      setIsSidebarCollapsed(nextWidth <= SIDEBAR_COLLAPSE_THRESHOLD);

      return nextWidth;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const goToProfile = () => {
    setShowProfileRequiredModal(false);
    navigate('/profile', { state: { activeTab: 'edit' } });
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
    <div
      className={`app-shell layout-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      style={{ '--layout-sidebar-width': `${sidebarWidth}px` }}
    >
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
            <button
              type="button"
              ref={profileButtonRef}
              className={`btn btn-light layout-user-toggle${currentProfile?.avatarUrl ? ' layout-user-avatar-toggle' : ''}`}
              onClick={() => setShowProfileSummary((current) => !current)}
              aria-label={t('nav.profile')}
              title={t('nav.profile')}
            >
              {currentProfile?.avatarUrl ? (
                <img src={currentProfile.avatarUrl} alt={t('nav.profile')} />
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
        <div
          className="layout-sidebar-resizer"
          role="separator"
          aria-label={t('sidebar.resize')}
          aria-orientation="vertical"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuenow={isSidebarCollapsed ? SIDEBAR_MIN_WIDTH : Math.round(sidebarWidth)}
          tabIndex={0}
          onPointerDown={handleSidebarResizeStart}
          onKeyDown={handleSidebarResizeKeyDown}
        />
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

      <Overlay
        target={profileButtonRef.current}
        show={showProfileSummary}
        placement="bottom-end"
        rootClose
        onHide={() => setShowProfileSummary(false)}
      >
        <Popover id="profile-summary-popover" className="profile-summary-popover">
          <Popover.Body>
            <div className="profile-summary-mini">
              <div>
                <span>{t('profilePage.fields.username')}</span>
                <strong>{currentProfile?.username || currentUser?.username || currentUser?.fullName || '-'}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{currentUser?.email || '-'}</strong>
              </div>
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>

      <Modal
        show={showProfileRequiredModal}
        onHide={() => setShowProfileRequiredModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('profilePage.completion.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-secondary mb-3">{t('profilePage.completion.description')}</p>
          {missingProfileFields.length > 0 && (
            <div>
              <div className="fw-semibold mb-2">{t('profilePage.completion.missingTitle')}</div>
              <ul className="mb-0">
                {missingProfileFields.map(([name, labelKey]) => (
                  <li key={name}>{t(labelKey)}</li>
                ))}
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowProfileRequiredModal(false)}>
            {t('profilePage.completion.later')}
          </Button>
          <Button variant="success" onClick={goToProfile}>
            {t('profilePage.completion.goToProfile')}
          </Button>
        </Modal.Footer>
      </Modal>

      <AuthTimeoutWatcher />
      <ReminderNotifier />
    </div>
  );
}

export default MainLayout;
