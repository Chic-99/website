// Visual style (avatar color + icon) per specialty, extracted from the original
// hand-built design so dynamically-loaded doctors look identical to the old
// hardcoded cards. If a brand-new specialty is added by an admin that isn't in
// this map, DEFAULT_STYLE is used so the UI still renders sensibly.

export const SPECIALTY_STYLES = {
  'Fertility': {
    avatarBg: '#FBEAF1', avatarColor: '#C2185B', badgeBg: '#C2185B',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>'
  },
  'Cardiology': {
    avatarBg: '#FBEAE8', avatarColor: '#C0392B', badgeBg: '#C0392B',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
  },
  'Orthopaedics': {
    avatarBg: '#FCF0E4', avatarColor: '#B5590C', badgeBg: '#B5590C',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="2.4"/><circle cx="17" cy="17" r="2.4"/><line x1="8.7" y1="8.7" x2="15.3" y2="15.3"/></svg>'
  },
  'Neurosurgery': {
    avatarBg: '#F1EAF7', avatarColor: '#6C3FA0', badgeBg: '#6C3FA0',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3a4 4 0 00-4 4c-1.5.5-2.5 2-2.5 3.5S6.5 13.5 8 14c-.3 1-.2 2 .3 2.8.8 1.3 2.3 2 3.7 1.7 1.4.3 2.9-.4 3.7-1.7.5-.8.6-1.8.3-2.8 1.5-.5 2.5-2 2.5-3.5S17.5 7.5 16 7a4 4 0 00-4-4z"/></svg>'
  },
  'Nephrology': {
    avatarBg: '#E9F1FB', avatarColor: '#1565C0', badgeBg: '#1565C0',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>'
  },
  'Hepatology': {
    avatarBg: '#EAF4EB', avatarColor: '#2E7D32', badgeBg: '#2E7D32',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l8 4v6c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V6l8-4z"/></svg>'
  },
  'General Medicine': {
    avatarBg: '#E9EEF2', avatarColor: '#092B43', badgeBg: '#092B43',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3v6a4 4 0 008 0V3"/><circle cx="18" cy="15.2" r="2.2"/><path d="M14 9v2.2a4 4 0 004 4"/></svg>'
  },
  'Dental': {
    avatarBg: '#E6F4F2', avatarColor: '#0B827B', badgeBg: '#0B827B',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2.2c-2.4 0-4.4 1.7-4.4 4 0 1.1.2 2 .5 3 .4 1.4.7 3.3.9 5.1.2 1.8.6 3.3 1.3 3.3.9 0 1-1.6 1.1-3.1.1-.9.3-1.6.5-1.6s.4.7.5 1.6c.2 1.5.3 3.1 1.1 3.1.7 0 1.1-1.5 1.3-3.3.2-1.8.5-3.7.9-5.1.3-1 .5-1.9.5-3 0-2.3-2-4-4.4-4z"/></svg>'
  }
};

export const DEFAULT_SPECIALTY_STYLE = {
  avatarBg: '#E9EEF2', avatarColor: '#092B43', badgeBg: '#092B43',
  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>'
};

export function styleForSpecialty(specialty){
  return SPECIALTY_STYLES[specialty] || DEFAULT_SPECIALTY_STYLE;
}

export const KNOWN_SPECIALTIES = Object.keys(SPECIALTY_STYLES);
