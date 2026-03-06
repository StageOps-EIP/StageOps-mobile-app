import { useState, useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  /** true when any connection is available and reachable */
  isOnline: boolean;
  /** connection type: 'wifi' | 'cellular' | 'none' | 'unknown' */
  type: string;
}

/**
 * Subscribes to network changes and returns the current status.
 * Updates reactively whenever connectivity changes.
 *
 * @example
 * const { isOnline } = useNetworkStatus();
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true, // optimistic default — updated immediately on mount
    type: 'unknown',
  });

  useEffect(() => {
    const fromState = (state: NetInfoState): NetworkStatus => ({
      isOnline: state.isConnected === true && state.isInternetReachable !== false,
      type: state.type ?? 'unknown',
    });

    // Fetch current state immediately
    NetInfo.fetch().then(state => setStatus(fromState(state)));

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setStatus(fromState(state));
    });

    return unsubscribe;
  }, []);

  return status;
}

