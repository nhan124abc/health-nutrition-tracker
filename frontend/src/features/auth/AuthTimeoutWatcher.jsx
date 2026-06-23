import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuthTokens, getAccessToken, getRefreshToken, logout } from '../../api/api';
import authConfig from '../../config/authConfig';

const lastActivityKey = 'auth:lastActivityAt';
const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

function getTokenExpiryMs(token) {
  if (!token) {
    return 0;
  }

  try {
    const [, payload] = token.split('.');
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const tokenPayload = JSON.parse(atob(normalizedPayload));

    return Number(tokenPayload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

function AuthTimeoutWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggingOutRef = useRef(false);

  const updateActivity = useCallback(() => {
    localStorage.setItem(lastActivityKey, String(Date.now()));
  }, []);

  const expireSession = useCallback(async () => {
    if (loggingOutRef.current) {
      return;
    }

    loggingOutRef.current = true;

    try {
      await logout();
    } catch {
      clearAuthTokens();
    } finally {
      clearAuthTokens();
      localStorage.removeItem(lastActivityKey);
      navigate('/login', {
        replace: true,
        state: { from: location, sessionExpired: true },
      });
    }
  }, [location, navigate]);

  const checkSession = useCallback(() => {
    if (!getAccessToken()) {
      return;
    }

    const now = Date.now();
    const lastActivityAt = Number(localStorage.getItem(lastActivityKey) || now);
    const refreshExpiresAt = getTokenExpiryMs(getRefreshToken());
    const idleExpired = now - lastActivityAt >= authConfig.sessionTimeoutMs;
    const refreshExpired = refreshExpiresAt > 0 && now >= refreshExpiresAt;

    if (idleExpired || refreshExpired) {
      expireSession();
    }
  }, [expireSession]);

  useEffect(() => {
    if (!getAccessToken()) {
      return undefined;
    }

    if (!localStorage.getItem(lastActivityKey)) {
      updateActivity();
    }

    const handleActivity = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    const intervalId = window.setInterval(checkSession, 30 * 1000);
    const refreshExpiresAt = getTokenExpiryMs(getRefreshToken());
    const timeoutId = refreshExpiresAt > Date.now()
      ? window.setTimeout(checkSession, refreshExpiresAt - Date.now() + 500)
      : null;

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.clearInterval(intervalId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [checkSession, updateActivity]);

  return null;
}

export default AuthTimeoutWatcher;
