import { useEffect, useState } from 'react';
import { getAudiences } from '../../api';

let cache = null;

// "Who should get this?" — customer groups with live counts.
export default function AudienceSelect({ id = 'aud', value, onChange, label = 'Send to' }) {
  const [groups, setGroups] = useState(cache);
  useEffect(() => {
    if (cache) return;
    getAudiences().then((d) => { cache = d.groups; setGroups(d.groups); }).catch(() => {});
  }, []);
  const opts = groups || [{ key: 'ALL', label: 'Everyone' }];
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value || 'ALL'} onChange={(e) => onChange(e.target.value)}>
        {opts.map((g) => <option key={g.key} value={g.key}>{g.label}{g.count !== undefined ? ` (${g.count.toLocaleString()})` : ''}</option>)}
      </select>
    </div>
  );
}

export function audienceLabel(key) {
  return (cache || []).find((g) => g.key === key)?.label || { ALL: 'Everyone', AGENTS: 'Agents only', NEW_7: 'Joined in the last 7 days', NEVER_BOUGHT: 'Never bought', ACTIVE_30: 'Bought in the last 30 days', INACTIVE_30: 'Not bought in 30 days', SLIPPING: 'Regulars slipping away' }[key] || key;
}
