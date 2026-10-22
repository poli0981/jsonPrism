import { useState } from 'react';

/**
 * "Unread output" badge for the mobile Output tab: on while the output changed
 * since the user last looked at that tab.
 *
 * Derived during render (React's "store information from previous renders"
 * pattern) instead of syncing state in effects.
 */
export function useOutputBadge(output: string, activeTab: 'input' | 'output'): boolean {
  const [seenOutput, setSeenOutput] = useState(output);
  if (activeTab === 'output' && seenOutput !== output) {
    setSeenOutput(output);
  }
  return activeTab !== 'output' && output !== '' && output !== seenOutput;
}
