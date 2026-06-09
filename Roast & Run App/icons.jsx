/* global React */
const S = (p, paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw || 1.8}
       strokeLinecap="round" strokeLinejoin="round" {...p}>{paths}</svg>
);

const Icons = {
  activity: (p={}) => S(p, <><path d="M3 12h4l2 6 4-14 2 8h6" /></>),
  plus: (p={}) => S(p, <><path d="M12 5v14M5 12h14" /></>),
  history: (p={}) => S(p, <><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></>),
  gift: (p={}) => S(p, <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /><path d="M12 8C12 8 11 3 8.5 3S5.5 5 5.5 5 6 8 8.5 8 12 8 12 8ZM12 8s1-5 3.5-5S18.5 5 18.5 5 18 8 15.5 8 12 8 12 8Z" /></>),
  trophy: (p={}) => S(p, <><path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" /><path d="M6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2" /><path d="M9 20h6M12 14v6" /></>),
  user: (p={}) => S(p, <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 18a5.5 5.5 0 0 1 11 0" /></>),
  logout: (p={}) => S(p, <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>),
  cup: (p={}) => S(p, <><path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 2.5c-.6.8-.6 1.7 0 2.5M11.5 2.5c-.6.8-.6 1.7 0 2.5" /></>),
  flame: (p={}) => S(p, <><path d="M12 3c.7 3-1.8 4-1.8 6.5a3 3 0 0 0 .8 2 2.4 2.4 0 0 1-2.5-1.2C7.4 13.5 7 14.7 7 16a5 5 0 0 0 10 .2c0-3.4-2.6-4.8-2.6-8.2 0-2-1-3.6-2.4-5Z" /></>),
  shoe: (p={}) => S(p, <><path d="M3 16v-3.2c0-.5.4-.9.9-.8l3.6.6 4-3.6c.4-.3 1-.3 1.3.1l1.6 2 4.4 1.6c1.2.4 2.2 1.4 2.2 2.7v.6H4a1 1 0 0 1-1-1Z" /><path d="M7.5 13.2l-1 1.6M11 10.8l-.8 1.7M14.5 11.5l-.6 1.6" /></>),
  ribbon: (p={}) => S(p, <><circle cx="12" cy="9" r="6" /><path d="M9 14l-2 7 5-3 5 3-2-7" /><path d="M12 6.2l1 2 2.2.2-1.7 1.5.5 2.1-2-1.1-2 1.1.5-2.1L8.8 8.4 11 8.2Z" sw={1.3} /></>),
  calendar: (p={}) => S(p, <><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>),
  edit: (p={}) => S(p, <><path d="M12 20h8" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>),
  trash: (p={}) => S(p, <><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6" /></>),
  arrowRight: (p={}) => S(p, <><path d="M5 12h14M13 6l6 6-6 6" /></>),
  check: (p={}) => S(p, <><path d="M5 12.5l4.5 4.5L19 7" /></>),
  lock: (p={}) => S(p, <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  mail: (p={}) => S(p, <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></>),
  phone: (p={}) => S(p, <><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V19a2 2 0 0 1-2.2 2A16 16 0 0 1 3 6.2 2 2 0 0 1 5 4Z" /></>),
  phoneCall: (p={}) => S(p, <><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V19a2 2 0 0 1-2.2 2A16 16 0 0 1 3 6.2 2 2 0 0 1 5 4Z" /><path d="M15 4a5 5 0 0 1 5 5M15 8a1.5 1.5 0 0 1 1.5 1.5" sw={1.5} /></>),
  x: (p={}) => S(p, <><path d="M6 6l12 12M18 6L6 18" /></>),
  mapPin: (p={}) => S(p, <><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>),
  save: (p={}) => S(p, <><path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M8 4v5h7V4M8 21v-7h8v7" /></>),
  medal: (p={}) => S(p, <><circle cx="12" cy="14" r="6" /><path d="M9 3l3 5 3-5" /><path d="M12 11.3l1 2 2.2.2-1.7 1.5.5 2.1-2-1.1-2 1.1.5-2.1L8.8 13.5l2.2-.2Z" sw={1.2} /></>),
  link: (p={}) => S(p, <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.3 7" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7L12.7 17" /></>),
  bolt: (p={}) => S(p, <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" /></>),
  calendarStar: (p={}) => S(p, <><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M12 12.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-1-1.8 1 .35-2L10.6 14.6l2-.3Z" sw={1.1} /></>),
  chevronDown: (p={}) => S(p, <><path d="M6 9l6 6 6-6" /></>),
};

window.Icons = Icons;
