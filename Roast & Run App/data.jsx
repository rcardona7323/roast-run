/* Seed state for the Roast & Run member prototype. Exposed as window.SEED */
window.SEED = {
  today: '2026-06-07',
  member: {
    name: 'Rick Cardona',
    first: 'Rick',
    initials: 'RC',
    color: '#C8611A',
    email: 'rick@identitypa.com',
    phone: '267-242-7756',
    emergencyName: 'Janeen',
    emergencyPhone: '267-446-0271',
    joined: '2026',
    strava: false,
  },
  // Rick's runs sum to ~22.6 mi
  runs: [
    { id: 'r1', date: '2026-06-05', miles: 3.1, source: 'Strava', club: false, notes: 'Easy shakeout along the canal.' },
    { id: 'r2', date: '2026-06-02', miles: 4.0, source: 'Manual', club: true, notes: 'Club tempo run — felt strong on the back half.' },
    { id: 'r3', date: '2026-05-28', miles: 2.5, source: 'Strava', club: false, notes: '' },
    { id: 'r4', date: '2026-05-21', miles: 2.22, source: 'Manual', club: false, notes: 'Quick lunch loop.' },
    { id: 'r5', date: '2026-05-14', miles: 5.2, source: 'Strava', club: false, notes: 'Long-ish Sunday miles.' },
    { id: 'r6', date: '2026-05-06', miles: 3.5, source: 'Manual', club: false, notes: '' },
    { id: 'r7', date: '2026-04-28', miles: 2.08, source: 'Manual', club: false, notes: 'First one back after a rest week.' },
  ],
  tiers: [
    { id: 't1', miles: 20,  name: 'Cafe Latte',  desc: 'Hit 20 miles and your hustle turns into a latte. Because every good run deserves a smooth finish.' },
    { id: 't2', miles: 40,  name: 'Parfait',     desc: '40 miles strong — you\u2019ve earned a parfait. Layers of miles, layers of goodness.' },
    { id: 't3', miles: 60,  name: 'Smoothie',    desc: 'You\u2019ve blended consistency, effort, and 60 miles of movement. Now let us blend the smoothie.' },
    { id: 't4', miles: 80,  name: 'Small Bowl',  desc: 'You\u2019ve put in the miles, now we\u2019ll fill the bowl. At 80 miles, enjoy a free small bowl on us.' },
    { id: 't5', miles: 100, name: 'Toast',       desc: 'You\u2019ve hit 100 miles, and that deserves a toast — literally. Choose from our sweet or savory toast category on us.' },
    { id: 't6', miles: 120, name: 'Large Bowl',  desc: 'You\u2019ve put in the miles, now we\u2019ll fill the bowl. At 120 miles, enjoy a free large bowl on us.' },
  ],
  // member's redemption requests
  redemptions: [
    { id: 'rd1', tierId: 't1', tier: 'Cafe Latte', miles: 20, date: '2026-05-30', status: 'pending' },
  ],
  events: [
    { id: 'e1', name: 'Sunrise Social Run', date: '2026-06-08', desc: '3 easy miles + coffee after at the café. All paces welcome.' },
    { id: 'e2', name: 'Saturday Long Run',  date: '2026-06-13', desc: 'Group long run from the shop. Routes for 6 and 10 miles.' },
    { id: 'e3', name: 'Solstice 10K',       date: '2026-06-20', desc: 'Our longest day, longest run. Stick around for cold brew.' },
  ],
  // All-Time leaderboard (Rick is #10). week/month are scaled subsets.
  leaderboard: [
    { name: 'Chris Miller',   runs: 1, all: 84.2, month: 31.0, week: 12.4, color: '#7C6FF0' },
    { name: 'Janeen Cardona', runs: 2, all: 58.9, month: 22.5, week: 9.1,  color: '#C8611A' },
    { name: 'Pat Lister',     runs: 2, all: 43.0, month: 18.2, week: 6.0,  color: '#3C5A43' },
    { name: 'Megan Boone',    runs: 5, all: 37.8, month: 15.4, week: 5.2,  color: '#6D3FC4' },
    { name: 'Erin Sawchak',   runs: 4, all: 33.5, month: 12.0, week: 4.8,  color: '#A79E92' },
    { name: 'Ashley Lincoln', runs: 6, all: 32.1, month: 14.1, week: 8.3,  color: '#D08A2E' },
    { name: 'Becca Fishel',   runs: 3, all: 31.8, month: 9.4,  week: 3.1,  color: '#2E6FB0' },
    { name: 'Colton Fishel',  runs: 3, all: 27.1, month: 8.0,  week: 2.0,  color: '#9A9186' },
    { name: 'Cam',            runs: 2, all: 24.0, month: 11.2, week: 4.0,  color: '#8A56D6' },
    { name: 'Rick Cardona',   runs: 7, all: 22.6, month: 7.1,  week: 7.1,  color: '#C8611A', isMe: true },
  ],
};
