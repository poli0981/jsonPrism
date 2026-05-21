import { useEffect, useRef, useState } from 'react';

// Tracks an "unread output" badge for the mobile Output tab: set when output
// changes while the user is on a different tab, cleared once they navigate over.
export function useOutputBadge(output: string, activeTab: 'input' | 'output'): boolean {
  const [hasUnreadOutput, setHasUnreadOutput] = useState(false);
  const prevOutputRef = useRef('');

  useEffect(() => {
    if (output !== prevOutputRef.current) {
      prevOutputRef.current = output;
      if (output && activeTab !== 'output') {
        setHasUnreadOutput(true);
      }
    }
  }, [output, activeTab]);

  useEffect(() => {
    if (activeTab === 'output') setHasUnreadOutput(false);
  }, [activeTab]);

  return hasUnreadOutput;
}
