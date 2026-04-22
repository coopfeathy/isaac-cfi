// Static seed data for the Merlin Ops Console. Ported verbatim from the
// Claude Design handoff bundle (index.html). Kept in a dedicated module so the
// page component stays readable.

export const AIRCRAFT = [
  { tail: 'N428MF', model: 'Cessna 172S', hobbs: 4218.3, nextInsp: '50h @ 4268', status: 'active' },
  { tail: 'N511MF', model: 'Cessna 172S', hobbs: 2971.6, nextInsp: '100h @ 3002', status: 'active' },
  { tail: 'N733MF', model: 'Piper PA-28', hobbs: 6104.9, nextInsp: 'Annual 06/12', status: 'squawk' },
  { tail: 'N902MF', model: 'Diamond DA40', hobbs: 1580.1, nextInsp: '50h @ 1602', status: 'active' },
  { tail: 'N219MF', model: 'Cessna 152', hobbs: 8844.0, nextInsp: '100h @ 8900', status: 'ground' },
] as const

export const INSTRUCTORS = [
  { id: 'cfi_01', initials: 'IM', name: 'Isaac M.', ratings: ['CFI', 'CFII', 'MEI'], color: 'blue' },
  { id: 'cfi_02', initials: 'RN', name: 'Reena N.', ratings: ['CFI'], color: 'teal' },
  { id: 'cfi_03', initials: 'DP', name: 'Darius P.', ratings: ['CFI', 'CFII'], color: 'violet' },
] as const

export const INITIAL_BOOKINGS = [
  { id: 'BK-20487', tail: 'N428MF', start: 2, end: 6, student: 'Avery Chen', cfi: 'cfi_01', lesson: 'PPL-07 Stalls', status: 'booked', paid: true },
  { id: 'BK-20488', tail: 'N428MF', start: 8, end: 12, student: 'Marcus Ortiz', cfi: 'cfi_02', lesson: 'PPL-12 S-Turns', status: 'in_flight', paid: true },
  { id: 'BK-20489', tail: 'N428MF', start: 15, end: 19, student: 'Priya Rao', cfi: 'cfi_01', lesson: 'PPL-14 XC Nav', status: 'booked', paid: true },
  { id: 'BK-20491', tail: 'N511MF', start: 0, end: 3, student: 'J. Whitaker', cfi: 'cfi_03', lesson: 'IR-04 Partial Panel', status: 'completed', paid: true },
  { id: 'BK-20492', tail: 'N511MF', start: 5, end: 9, student: 'Sofia Haddad', cfi: 'cfi_01', lesson: 'PPL-09 Emergencies', status: 'booked', paid: true },
  { id: 'BK-20493', tail: 'N511MF', start: 11, end: 14, student: 'L. Petrov', cfi: 'cfi_02', lesson: 'Discovery Flight', status: 'pending', paid: false },
  { id: 'BK-20494', tail: 'N511MF', start: 18, end: 22, student: 'T. Okafor', cfi: 'cfi_03', lesson: 'PPL-18 Checkride Prep', status: 'booked', paid: true },
  { id: 'BK-20496', tail: 'N733MF', start: 1, end: 5, student: 'Grace Linden', cfi: 'cfi_02', lesson: 'PPL-03 Airwork', status: 'booked', paid: true },
  { id: 'BK-20497', tail: 'N733MF', start: 13, end: 16, student: '— MAINT', cfi: null, lesson: 'Squawk: EGT gauge', status: 'maint', paid: null },
  { id: 'BK-20498', tail: 'N902MF', start: 2, end: 6, student: 'R. Delacroix', cfi: 'cfi_03', lesson: 'IR-07 Approaches', status: 'booked', paid: true },
  { id: 'BK-20499', tail: 'N902MF', start: 10, end: 14, student: 'Hana Kim', cfi: 'cfi_01', lesson: 'CPL-02 Commercial Maneuvers', status: 'booked', paid: true },
  { id: 'BK-20500', tail: 'N902MF', start: 16, end: 20, student: 'E. Bergström', cfi: 'cfi_02', lesson: 'PPL-05 Traffic Pattern', status: 'booked', paid: true },
  { id: 'BK-20502', tail: 'N219MF', start: 4, end: 8, student: '— AOG', cfi: null, lesson: 'Awaiting parts: alternator', status: 'aog', paid: null },
]

export const STUDENTS = [
  { id: 'STU-0412', name: 'Avery Chen', phase: 'PPL · Solo XC', progress: 0.62, balance: 487.50, lastLesson: '2026-04-20', status: 'active' },
  { id: 'STU-0418', name: 'Marcus Ortiz', phase: 'PPL · Pre-solo', progress: 0.34, balance: 1240.00, lastLesson: '2026-04-21', status: 'active' },
  { id: 'STU-0421', name: 'Priya Rao', phase: 'PPL · XC', progress: 0.71, balance: 0.00, lastLesson: '2026-04-22', status: 'active' },
  { id: 'STU-0405', name: 'Sofia Haddad', phase: 'PPL · Pre-solo', progress: 0.41, balance: -320.75, lastLesson: '2026-04-19', status: 'active' },
  { id: 'STU-0431', name: 'J. Whitaker', phase: 'IR · Partial Panel', progress: 0.55, balance: 110.00, lastLesson: '2026-04-22', status: 'active' },
  { id: 'STU-0433', name: 'T. Okafor', phase: 'PPL · Checkride', progress: 0.94, balance: 0.00, lastLesson: '2026-04-20', status: 'active' },
  { id: 'STU-0440', name: 'Hana Kim', phase: 'CPL · Commercial', progress: 0.22, balance: 2050.00, lastLesson: '2026-04-18', status: 'active' },
  { id: 'STU-0441', name: 'L. Petrov', phase: 'Prospect · Discovery', progress: 0.05, balance: 0.00, lastLesson: '—', status: 'pending' },
  { id: 'STU-0444', name: 'R. Delacroix', phase: 'IR · Approaches', progress: 0.68, balance: 0.00, lastLesson: '2026-04-21', status: 'active' },
] as const

export const INITIAL_ALERTS = [
  { id: 'AL-001', sev: 'warn',  code: 'BI-104', msg: 'Paid/unbooked: student STU-0418 has paid invoice INV-7712 without active booking', ts: '08:42', resolved: false },
  { id: 'AL-002', sev: 'info',  code: 'BI-118', msg: 'Stale pending slot request SR-2214 (>48h) from L. Petrov — auto-escalated', ts: '08:51', resolved: false },
  { id: 'AL-003', sev: 'error', code: 'BI-090', msg: 'N219MF AOG — 3 bookings to reassign for 24 Apr', ts: '07:15', resolved: false },
  { id: 'AL-004', sev: 'warn',  code: 'WH-221', msg: 'Stripe webhook retry: charge.succeeded for cus_9kLm — 2 failures', ts: '09:04', resolved: false },
  { id: 'AL-005', sev: 'info',  code: 'CAL-07', msg: 'CalDAV sync to cfi_02 Google calendar completed · 14 events pushed', ts: '09:12', resolved: false },
]

export const SLOT_REQUESTS = [
  { id: 'SR-2214', student: 'L. Petrov', preferred: '2026-04-23 14:00', alt: '2026-04-24 10:00', lesson: 'Discovery Flight', cfiPref: 'any', ageH: 52, status: 'pending' },
  { id: 'SR-2221', student: 'Avery Chen', preferred: '2026-04-25 09:00', alt: '2026-04-26 09:00', lesson: 'PPL-08 Ground Ref', cfiPref: 'cfi_01', ageH: 14, status: 'pending' },
  { id: 'SR-2223', student: 'Hana Kim', preferred: '2026-04-24 13:30', alt: '—', lesson: 'CPL-03 Complex', cfiPref: 'cfi_01', ageH: 7, status: 'pending' },
] as const

export const DISPATCH = [
  { id: 'BK-20492', tail: 'N511MF', student: 'Sofia Haddad', cfi: 'cfi_01', slot: '08:30 – 11:00', checks: { fuel: true, weather: true, brief: true, weight: false }, eta: 'Ready' },
  { id: 'BK-20488', tail: 'N428MF', student: 'Marcus Ortiz', cfi: 'cfi_02', slot: '11:00 – 13:00', checks: { fuel: true, weather: true, brief: false, weight: false }, eta: 'In flight' },
  { id: 'BK-20498', tail: 'N902MF', student: 'R. Delacroix', cfi: 'cfi_03', slot: '08:00 – 10:00', checks: { fuel: true, weather: true, brief: true, weight: true }, eta: 'Ready' },
] as const

export const INVOICES = [
  { id: 'INV-7712', student: 'Marcus Ortiz', total: 430.00, paid: 430.00, issued: '2026-04-20', due: '2026-04-27', status: 'paid', stripe: 'pi_3Oq…xR7' },
  { id: 'INV-7715', student: 'Avery Chen', total: 860.00, paid: 372.50, issued: '2026-04-18', due: '2026-04-25', status: 'partial', stripe: 'pi_3Os…kL2' },
  { id: 'INV-7718', student: 'L. Petrov', total: 215.00, paid: 0, issued: '2026-04-22', due: '2026-04-29', status: 'open', stripe: null },
  { id: 'INV-7709', student: 'Sofia Haddad', total: 645.00, paid: 0, issued: '2026-04-15', due: '2026-04-22', status: 'overdue', stripe: null },
  { id: 'INV-7702', student: 'J. Whitaker', total: 1075.00, paid: 1075.00, issued: '2026-04-10', due: '2026-04-17', status: 'paid', stripe: 'pi_3Oj…nM1' },
  { id: 'INV-7725', student: 'Hana Kim', total: 2050.00, paid: 0, issued: '2026-04-22', due: '2026-04-29', status: 'open', stripe: null },
] as const

export const SYLLABUS = [
  { id: 'PPL', title: 'Private Pilot Licence', lessons: 22, students: 5, open: true, children: [
    { id: 'PPL-pre', title: 'Pre-solo (1–8)', lessons: 8 },
    { id: 'PPL-solo', title: 'Solo Phase (9–14)', lessons: 6 },
    { id: 'PPL-xc', title: 'Cross-Country (15–19)', lessons: 5 },
    { id: 'PPL-test', title: 'Checkride Prep (20–22)', lessons: 3 },
  ]},
  { id: 'IR', title: 'Instrument Rating', lessons: 18, students: 2, open: false },
  { id: 'CPL', title: 'Commercial Pilot', lessons: 24, students: 1, open: false },
  { id: 'CFI', title: 'Flight Instructor', lessons: 16, students: 0, open: false },
] as const

export const ONBOARDING = [
  { id: 'ONB-041', name: 'Clara Mendez', stage: 'Medical Pending', progress: 0.4, started: '2026-04-20', notes: '3rd class med in review' },
  { id: 'ONB-042', name: 'Wendell Park', stage: 'Deposit Paid',  progress: 0.6, started: '2026-04-19', notes: 'Scheduled intro 04/24' },
  { id: 'ONB-043', name: 'Yui Tanaka',   stage: 'Intake Form',    progress: 0.2, started: '2026-04-21', notes: 'Awaiting form completion' },
  { id: 'ONB-044', name: 'Aaron Shaw',   stage: 'Ready for First Lesson', progress: 0.9, started: '2026-04-15', notes: 'Assign CFI · convert to STU' },
] as const

export const PAYOUTS = [
  { id: 'po_1OqAB…', date: '2026-04-22', amount: 8420.14, fees: 251.75, count: 14, status: 'paid', arrival: '2026-04-24' },
  { id: 'po_1Oq8T…', date: '2026-04-15', amount: 6192.00, fees: 185.44, count: 11, status: 'paid', arrival: '2026-04-17' },
  { id: 'po_1Oq4P…', date: '2026-04-08', amount: 5870.50, fees: 175.96, count: 10, status: 'paid', arrival: '2026-04-10' },
  { id: 'po_1Oq2J…', date: '2026-04-01', amount: 4412.00, fees: 132.11, count: 8,  status: 'paid', arrival: '2026-04-03' },
  { id: 'po_1Oq1A…', date: '2026-03-25', amount: 7205.80, fees: 216.77, count: 13, status: 'paid', arrival: '2026-03-27' },
] as const

export const EXPENSES = [
  { id: 'EX-3301', category: 'Fuel',        vendor: 'KMHR Avgas',     amount: 1842.50, date: '2026-04-21' },
  { id: 'EX-3302', category: 'Maintenance', vendor: 'Delta Aviation', amount: 3250.00, date: '2026-04-20' },
  { id: 'EX-3303', category: 'Insurance',   vendor: 'Avemco',         amount: 1120.00, date: '2026-04-18' },
  { id: 'EX-3304', category: 'Hangar',      vendor: 'Mather Field',   amount: 2800.00, date: '2026-04-15' },
  { id: 'EX-3305', category: 'Parts',       vendor: 'Aircraft Spruce', amount: 486.20, date: '2026-04-14' },
] as const

export const SUBSCRIPTIONS = [
  { id: 'sub_1Oq8Ay', student: 'Avery Chen',   plan: 'Block-10 Hrs · $1,950', status: 'active',   renews: '2026-05-14', mrr: 195.00 },
  { id: 'sub_1Oq4Rn', student: 'Priya Rao',    plan: 'PPL Unlimited Ground',  status: 'active',   renews: '2026-05-02', mrr: 99.00 },
  { id: 'sub_1Oq2Kz', student: 'Hana Kim',     plan: 'Block-20 Hrs · $3,700', status: 'active',   renews: '2026-05-22', mrr: 370.00 },
  { id: 'sub_1OpYTx', student: 'Marcus Ortiz', plan: 'Discovery Monthly',     status: 'past_due', renews: '2026-04-20', mrr: 49.00 },
  { id: 'sub_1OpWQd', student: 'L. Petrov',    plan: 'PPL Unlimited Ground',  status: 'canceled', renews: '—',          mrr: 0 },
] as const

export const CREDITS = [
  { id: 'CR-2201', student: 'Sofia Haddad', balance: 215.00, source: 'Overpayment · INV-7661',    issued: '2026-04-12' },
  { id: 'CR-2198', student: 'R. Delacroix', balance: 430.00, source: 'Weather cancel · BK-20402', issued: '2026-04-08' },
  { id: 'CR-2191', student: 'T. Okafor',    balance:  85.00, source: 'Goodwill · BK-20377',       issued: '2026-04-02' },
  { id: 'CR-2187', student: 'Grace Linden', balance: 172.50, source: 'Block rollover',             issued: '2026-03-30' },
  { id: 'CR-2180', student: 'E. Bergström', balance:  60.00, source: 'Referral bonus',             issued: '2026-03-25' },
] as const

export const DISPUTES = [
  { id: 'dp_1OqC7a', invoice: 'INV-7709', student: 'Sofia Haddad', amount: 645.00, reason: 'Product not received', status: 'needs_response', due: '2026-04-26' },
  { id: 'dp_1OpWRb', invoice: 'INV-7683', student: 'L. Petrov',    amount: 215.00, reason: 'Duplicate',            status: 'under_review',   due: '2026-04-28' },
  { id: 'dp_1OpPWd', invoice: 'INV-7642', student: 'M. Silva',     amount: 430.00, reason: 'Fraudulent',           status: 'won',            due: '—' },
] as const

export const SQUAWKS = [
  { id: 'SQ-118', tail: 'N733MF', item: 'EGT gauge #3 erratic at cruise', reported: '2026-04-21', by: 'Reena N.',  severity: 'minor', status: 'open' },
  { id: 'SQ-117', tail: 'N733MF', item: 'Nav light intermittent',         reported: '2026-04-19', by: 'Isaac M.',  severity: 'minor', status: 'deferred' },
  { id: 'SQ-116', tail: 'N219MF', item: 'Alternator output low · AOG',    reported: '2026-04-18', by: 'Darius P.', severity: 'major', status: 'open' },
  { id: 'SQ-115', tail: 'N428MF', item: 'Seat rail play, pilot side',     reported: '2026-04-16', by: 'Reena N.',  severity: 'minor', status: 'resolved' },
  { id: 'SQ-114', tail: 'N902MF', item: 'Transponder code entry sticky',  reported: '2026-04-14', by: 'Isaac M.',  severity: 'minor', status: 'resolved' },
] as const

export const MAINT_EVENTS = [
  { id: 'MX-501', tail: 'N428MF', kind: '50-hr',   due: '2026-04-28', dueHobbs: 4268.0, hobbs: 4218.3, status: 'upcoming' },
  { id: 'MX-502', tail: 'N511MF', kind: '100-hr',  due: '2026-05-12', dueHobbs: 3002.0, hobbs: 2971.6, status: 'upcoming' },
  { id: 'MX-503', tail: 'N733MF', kind: 'Annual',  due: '2026-06-12', dueHobbs: null,   hobbs: 6104.9, status: 'scheduled' },
  { id: 'MX-504', tail: 'N733MF', kind: 'Squawk',  due: '2026-04-24', dueHobbs: null,   hobbs: 6104.9, status: 'in_shop' },
  { id: 'MX-505', tail: 'N219MF', kind: 'AOG',     due: '2026-04-23', dueHobbs: null,   hobbs: 8844.0, status: 'awaiting_parts' },
  { id: 'MX-506', tail: 'N902MF', kind: '50-hr',   due: '2026-05-04', dueHobbs: 1602.0, hobbs: 1580.1, status: 'upcoming' },
] as const

export const TICKS = Array.from({ length: 25 }, (_, i) => {
  const mins = i * 30 + 7 * 60
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
})

export const STATUS: Record<string, { fill: string; stroke: string; text: string; label: string }> = {
  booked:    { fill: 'var(--blue-2)',   stroke: 'var(--blue-1)',   text: 'var(--blue-text)',   label: 'BOOKED' },
  in_flight: { fill: 'var(--teal-2)',   stroke: 'var(--teal-1)',   text: 'var(--teal-text)',   label: 'IN FLIGHT' },
  completed: { fill: 'var(--gray-2)',   stroke: 'var(--gray-1)',   text: 'var(--gray-text)',   label: 'COMPLETED' },
  pending:   { fill: 'var(--amber-2)',  stroke: 'var(--amber-1)',  text: 'var(--amber-text)',  label: 'PENDING' },
  maint:     { fill: 'var(--violet-2)', stroke: 'var(--violet-1)', text: 'var(--violet-text)', label: 'MAINT' },
  aog:       { fill: 'var(--red-2)',    stroke: 'var(--red-1)',    text: 'var(--red-text)',    label: 'AOG' },
}

export const VIEW_META: Record<string, { title: string; doc: string; tabs: string[] }> = {
  schedule:   { title: 'Schedule Board',    doc: 'Daily ops · 22 Apr 2026',  tabs: ['Board', 'Timeline', 'Calendar', 'Capacity'] },
  fleet:      { title: 'Fleet',             doc: '5 aircraft · 1 AOG',       tabs: ['Roster', 'Maintenance', 'Hobbs', 'Squawks'] },
  students:   { title: 'Students',          doc: '9 active · 1 prospect',    tabs: ['Roster', 'Progress', 'Solo Status', 'Hold Points'] },
  integrity:  { title: 'Integrity Monitor', doc: '5 open · last run 09:12',  tabs: ['Alerts', 'Rules', 'Runs', 'Snapshots'] },
  requests:   { title: 'Slot Requests',     doc: '3 pending · 1 stale',      tabs: ['Queue', 'Filters', 'Rules', 'Archive'] },
  dispatch:   { title: 'Dispatch Queue',    doc: '3 ready · 1 in flight',    tabs: ['Ready', 'Pre-flight', 'Post-flight', 'Squawks'] },
  syllabus:   { title: 'Syllabus',          doc: '4 courses · 80 lessons',   tabs: ['Courses', 'Lessons', 'Debriefs', 'Endorsements'] },
  onboarding: { title: 'Onboarding Queue',  doc: '4 prospects',              tabs: ['Queue', 'Pipeline', 'Conversions', 'Archived'] },
  debriefs:   { title: 'Lesson Debriefs',   doc: 'Recent 30 days',           tabs: ['Recent', 'Flagged', 'By CFI', 'By Student'] },
  billing:    { title: 'Billing',           doc: '6 invoices · 2 overdue',   tabs: ['Invoices', 'Subscriptions', 'Credit', 'Disputes'] },
  expenses:   { title: 'Expenses',          doc: 'YTD · $9,498.70',          tabs: ['Ledger', 'Categories', 'Vendors', 'Receipts'] },
  payouts:    { title: 'Stripe Payouts',    doc: '5 recent · $32,100',       tabs: ['Payouts', 'Balances', 'Transfers', 'Fees'] },
}

export type TreeNodeData = {
  id: string
  label: string
  sub?: string
  kind?: 'view' | 'aircraft' | 'student' | 'link'
  view?: string
  href?: string
  badge?: string | null
  badgeKind?: string | null
  open?: boolean
  count?: number
  children?: TreeNodeData[]
}

export const TREE: TreeNodeData[] = [
  { id: 'ops', label: 'Operations', count: 4, open: true, children: [
    { id: 'schedule', label: 'Schedule Board', kind: 'view', view: 'schedule', badge: '14' },
    { id: 'slot-requests', label: 'Slot Requests', kind: 'view', view: 'requests', badge: '3' },
    { id: 'dispatch', label: 'Dispatch Queue', kind: 'view', view: 'dispatch', badge: '2' },
    { id: 'integrity', label: 'Integrity Monitor', kind: 'view', view: 'integrity', badge: '!', badgeKind: 'warn' },
  ]},
  { id: 'fleet-g', label: 'Fleet', count: 5, open: true, children: [
    { id: 'fleet-all', label: 'All Aircraft', kind: 'view', view: 'fleet' },
    ...AIRCRAFT.map(a => ({
      id: `ac_${a.tail}`, label: a.tail, sub: a.model, kind: 'aircraft' as const,
      badge: a.status === 'ground' ? 'AOG' : a.status === 'squawk' ? 'SQK' : null,
      badgeKind: a.status === 'ground' ? 'error' : a.status === 'squawk' ? 'warn' : null,
    })),
  ]},
  { id: 'students-g', label: 'Students', count: STUDENTS.length, open: true, children: [
    { id: 'students-all', label: 'All Students', kind: 'view', view: 'students' },
    ...STUDENTS.slice(0, 6).map(s => ({ id: s.id, label: s.name, sub: s.phase, kind: 'student' as const })),
  ]},
  { id: 'academy', label: 'Academy', count: 3, open: false, children: [
    { id: 'syllabus', label: 'Syllabus', kind: 'view', view: 'syllabus' },
    { id: 'onboarding', label: 'Onboarding', kind: 'view', view: 'onboarding', badge: '4' },
    { id: 'debriefs', label: 'Lesson Debriefs', kind: 'view', view: 'debriefs' },
  ]},
  { id: 'finance', label: 'Finance', count: 3, open: false, children: [
    { id: 'billing', label: 'Billing', kind: 'view', view: 'billing', badge: '2', badgeKind: 'warn' },
    { id: 'expenses', label: 'Expenses', kind: 'view', view: 'expenses' },
    { id: 'payouts', label: 'Stripe Payouts', kind: 'view', view: 'payouts' },
  ]},
  { id: 'admin-workspaces', label: 'Admin Workspaces', count: 17, open: true, children: [
    // Learn Platform
    { id: 'adm-courses',     label: 'Manage Courses',      sub: 'Learn',    kind: 'link', href: '/admin/courses' },
    { id: 'adm-enrollments', label: 'Assign Students',     sub: 'Learn',    kind: 'link', href: '/admin/enrollments' },
    { id: 'adm-progress',    label: 'Lesson Debriefs',     sub: 'Learn',    kind: 'link', href: '/admin/progress' },
    // Students & Prospects
    { id: 'adm-students',    label: 'Students',            sub: 'Students', kind: 'link', href: '/admin/students' },
    { id: 'adm-billing',     label: 'Billing',             sub: 'Students', kind: 'link', href: '/admin/billing' },
    { id: 'adm-expenses',    label: 'Account Balances',    sub: 'Students', kind: 'link', href: '/admin/expenses' },
    { id: 'adm-prospects',   label: 'Prospects',           sub: 'Students', kind: 'link', href: '/admin/prospects' },
    { id: 'adm-onboarding',  label: 'Onboarding Queue',    sub: 'Students', kind: 'link', href: '/admin/onboarding' },
    // Bookings & Schedule
    { id: 'adm-slots',       label: 'Manage Slots',        sub: 'Bookings', kind: 'link', href: '/admin/slots' },
    { id: 'adm-bookings',    label: 'View Bookings',       sub: 'Bookings', kind: 'link', href: '/admin/bookings' },
    { id: 'adm-calendar',    label: 'Calendar Sync',       sub: 'Bookings', kind: 'link', href: '/admin/calendar' },
    { id: 'adm-aircraft',    label: 'Aircraft Flight Log', sub: 'Bookings', kind: 'link', href: '/admin/aircraft' },
    { id: 'adm-items',       label: 'Training Items',      sub: 'Bookings', kind: 'link', href: '/admin/items' },
    // Content
    { id: 'adm-blog',        label: 'Create Blog Post',    sub: 'Content',  kind: 'link', href: '/admin/blog' },
    { id: 'adm-social',      label: 'Manage Social Posts', sub: 'Content',  kind: 'link', href: '/admin/social' },
    { id: 'adm-email',       label: 'Email Campaigns',     sub: 'Content',  kind: 'link', href: '/admin/email' },
    // Finance
    { id: 'adm-revenue',     label: 'Revenue Tracker',     sub: 'Finance',  kind: 'link', href: '/admin/revenue' },
  ]},
]
