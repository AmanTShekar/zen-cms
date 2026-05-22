import React, { useEffect } from 'react';
import api from '../lib/api';
import { useSiteStore } from '../lib/siteStore';

import { toast } from 'react-hot-toast';

// Simple glass‑morphic dropdown for site selection
export const SiteSelector: React.FC = () => {
  const { activeSiteId, setActiveSiteId } = useSiteStore();
  const [sites, setSites] = React.useState<Array<{ _id: string; name: string }>>([]);

  // Load sites on mount
  useEffect(() => {
    api
      .get('/sites')
      .then((res) => setSites(res.data?.data || []))
      .catch(() => toast.error('Failed to load sites'));
  }, []);

  // Persist selection to localStorage & axios header
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setActiveSiteId(id);
    localStorage.setItem('activeSiteId', id);
    // Update global axios header (admin lib api uses axios instance)
    api.defaults.headers['x-zenith-site-id'] = id;
  };

  // Initialise from storage if present
  useEffect(() => {
    const stored = localStorage.getItem('activeSiteId');
    if (stored) {
      setActiveSiteId(stored);
      api.defaults.headers['x-zenith-site-id'] = stored;
    }
  }, []);

  return (
    <div className="relative inline-block text-left">
      <select
        value={activeSiteId ?? ''}
        onChange={handleChange}
        className="appearance-none bg-white bg-opacity-20 backdrop-blur-md border border-gray-300 rounded-md shadow-sm py-1 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="" disabled>
          Select site…
        </option>
        {sites.map((site) => (
          <option key={site._id} value={site._id}>
            {site.name}
          </option>
        ))}
      </select>
    </div>
  );
};
