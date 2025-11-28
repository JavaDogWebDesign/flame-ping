import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { State } from '../../../../store/reducers';
import classes from './HealthCheckIndicator.module.css';
import axios from 'axios';

interface Props {
  url: string;
}

type HealthStatus = 'online' | 'offline' | 'checking' | 'disabled';

export const HealthCheckIndicator = ({ url }: Props): JSX.Element | null => {
  const { config } = useSelector((state: State) => state.config);
  const [status, setStatus] = useState<HealthStatus>('checking');
  const isFirstCheck = useRef(true);

  const checkHealth = useCallback(async () => {
    if (!config.healthCheckEnabled || !url) {
      setStatus('disabled');
      return;
    }

    // Only show "checking" on the very first check
    if (isFirstCheck.current) {
      setStatus('checking');
      isFirstCheck.current = false;
    }

    try {
      const response = await axios.post('/api/apps/health-check', { url });
      if (response.data.success && response.data.data.status === 'online') {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      setStatus('offline');
    }
  }, [url, config.healthCheckEnabled]);

  useEffect(() => {
    if (!config.healthCheckEnabled) {
      setStatus('disabled');
      return;
    }

    // Initial check
    checkHealth();

    // Set up interval for periodic checks
    const intervalMs = (config.healthCheckInterval || 60) * 1000;
    const interval = setInterval(checkHealth, intervalMs);

    return () => clearInterval(interval);
  }, [checkHealth, config.healthCheckEnabled, config.healthCheckInterval]);

  // Don't render if health check is disabled
  if (!config.healthCheckEnabled) {
    return null;
  }

  const getStatusClass = () => {
    switch (status) {
      case 'online':
        return classes.Online;
      case 'offline':
        return classes.Offline;
      case 'checking':
        return classes.Checking;
      default:
        return '';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'online':
        return 'Service is online';
      case 'offline':
        return 'Service is offline';
      case 'checking':
        return 'Checking status...';
      default:
        return '';
    }
  };

  return (
    <span
      className={`${classes.HealthIndicator} ${getStatusClass()}`}
      title={getTitle()}
    />
  );
};
