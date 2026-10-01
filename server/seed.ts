import { query, queryOne, run } from './db.js';
import crypto from 'crypto';

export function seedInitialDataIfNeeded(forceReset = false): void {
  const existingTasks = query<{ count: number }>('SELECT COUNT(*) as count FROM tasks');
  const legacyPackages = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM packages WHERE code IN ('PK-101', 'PK-202', 'PK-303', 'PK-404', 'PK-505', 'PK-606')");
  
  const shouldReset = forceReset || (legacyPackages && legacyPackages.count > 0);
  if (!shouldReset && existingTasks[0]?.count > 0) {
    return;
  }

  console.log('Seeding initial engineering task management database with complete EPC demo dataset...');

  if (shouldReset || forceReset) {
    run('DELETE FROM task_activities');
    run('DELETE FROM task_attachments');
    run('DELETE FROM task_comments');
    run('DELETE FROM task_tags');
    run('DELETE FROM tasks');
    run('DELETE FROM tags');
    run('DELETE FROM packages');
    run('DELETE FROM projects');
    run('DELETE FROM categories');
    run('DELETE FROM users');
  }

  const now = new Date();
  const formatIso = (d: Date) => d.toISOString();
  const formatYmd = (d: Date) => d.toISOString().split('T')[0];

  const addDays = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return formatYmd(d);
  };

  // 1. Seed Users (Single Primary User Workspace)
  const users = [
    {
      id: 'usr-1',
      name: 'Alex Morgan',
      role: 'Lead Project & Discipline Engineer',
      avatar: 'AM',
      email: 'ptscmc.ai11@gmail.com',
      phone: '+84 90 123 4567',
      discipline: 'Instrumentation & Control',
      bio: 'Lead Engineer managing EPC deliverables, package follow-ups, and technical squad checks.',
      is_admin: 1,
      is_active: 1,
    },
  ];

  for (const u of users) {
    run(
      'INSERT OR REPLACE INTO users (id, name, role, avatar, email, phone, bio, discipline, is_admin, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.role, u.avatar, u.email, u.phone, u.bio, u.discipline, u.is_admin, u.is_active, formatIso(now)]
    );
  }

  // 2. Seed Projects
  const projects = [
    {
      id: 'prj-1',
      name: 'Block B Gas Processing Facility EPC',
      code: 'PRJ-B01',
      client: 'Vietnam Oil & Gas Group (PVN)',
      description: 'Offshore Central Processing Platform (CPP) & Onshore Gas Terminal with high H2S / CO2 gas treatment trains.',
      status: 'ACTIVE',
      start_date: addDays(-60),
      end_date: addDays(300),
    },
    {
      id: 'prj-2',
      name: 'Lac Da Vang (Golden Camel) Offshore Field Development',
      code: 'PRJ-LDV',
      client: 'Murphy Oil / PTSC',
      description: 'Wellhead Platform A (WHP-A) and Floating Production, Storage and Offloading (FPSO) tie-back facility.',
      status: 'ACTIVE',
      start_date: addDays(-40),
      end_date: addDays(240),
    },
    {
      id: 'prj-3',
      name: 'White Tiger (Bach Ho) Compression Station Upgrade',
      code: 'PRJ-WTG',
      client: 'Vietsovpetro (VSP)',
      description: 'Upgrade of 2x 25MW Gas Turbine Driven Centrifugal Compressors with advanced anti-surge control & ESD systems.',
      status: 'ACTIVE',
      start_date: addDays(-30),
      end_date: addDays(180),
    },
  ];

  for (const pr of projects) {
    run(
      'INSERT OR REPLACE INTO projects (id, name, code, client, description, status, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [pr.id, pr.name, pr.code, pr.client, pr.description, pr.status, pr.start_date, pr.end_date, formatIso(now), formatIso(now)]
    );
  }

  // 3. Seed Categories
  const categories = [
    { id: 'cat-1', name: 'General Engineering', description: 'General discipline technical tasks, drawings, and deliverables', color: '#2563eb', is_default: 1 },
    { id: 'cat-2', name: 'Technical Meeting & KOM', description: 'Client, vendor, multi-discipline reviews, and HAZOP sessions', color: '#8b5cf6', is_default: 0 },
    { id: 'cat-3', name: 'Vendor Follow-up & Clarification', description: 'Technical Bid Evaluations (TBE), expediting, queries, and comments', color: '#f59e0b', is_default: 0 },
    { id: 'cat-4', name: 'Project Administration & MDR', description: 'Document transmittals, Master Document Register, schedules, and filings', color: '#64748b', is_default: 0 },
    { id: 'cat-5', name: 'Detailed Engineering Review', description: 'Detailed drawing, calculation sheet, specification, and datasheet checks', color: '#0d9488', is_default: 0 },
  ];

  for (const c of categories) {
    run(
      'INSERT OR REPLACE INTO categories (id, name, description, color, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.description, c.color, c.is_default, formatIso(now)]
    );
  }

  // 4. Seed Distinct Project-Specific Packages (4 Packages per Project)
  const packages = [
    // Project 1: Block B (PRJ-B01) Packages
    { id: 'pkg-b01-1', project_id: 'prj-1', name: 'Gas Metering Skid & Fiscal Analyzer Shelter', code: 'B01-PK-101', description: 'Fiscal ultrasonic / Coriolis metering skids, flow computers, and gas chromatograph analyzer shelter', status: 'ACTIVE' },
    { id: 'pkg-b01-2', project_id: 'prj-1', name: 'Severe Service HIPPS & ESD Valve Package', code: 'B01-PK-201', description: 'Emergency Shutdown (ESD) valves, HIPPS valves, choke valves, and safety relief valves (PSV)', status: 'ACTIVE' },
    { id: 'pkg-b01-3', project_id: 'prj-1', name: 'Integrated Control & Safety System (ICSS / ESD / F&G)', code: 'B01-PK-301', description: 'Distributed Control System (DCS), Safety Instrumented System (SIS), and Fire & Gas logic matrix', status: 'ACTIVE' },
    { id: 'pkg-b01-4', project_id: 'prj-1', name: 'Subsea Umbilical & PLEM Instrumentation', code: 'B01-PK-401', description: 'Subsea PLEM pressure/temperature sensors, hydraulic umbilical termination, and topside Master Control Unit (MCU)', status: 'ACTIVE' },

    // Project 2: Lac Da Vang (PRJ-LDV) Packages
    { id: 'pkg-ldv-1', project_id: 'prj-2', name: 'WHP-A Wellhead Control Panel & Hydraulic HPU', code: 'LDV-PK-102', description: 'High-pressure hydraulic power unit, pneumatic logic panels, and wellhead surface safety shutdown systems', status: 'ACTIVE' },
    { id: 'pkg-ldv-2', project_id: 'prj-2', name: 'Field Process Transmitters & Multiphase Meters', code: 'LDV-PK-202', description: 'Multivariable transmitters, multiphase flowmeters (MPFM), and radar tank level gauges', status: 'ACTIVE' },
    { id: 'pkg-ldv-3', project_id: 'prj-2', name: 'MV/LV Switchgear & Electrical Transformer Package', code: 'LDV-PK-302', description: 'HV/LV switchgear line-up, vacuum circuit breakers, and hazardous area oil-filled transformers', status: 'ACTIVE' },
    { id: 'pkg-ldv-4', project_id: 'prj-2', name: 'Emergency Diesel Generator (EDG) Power Skid', code: 'LDV-PK-402', description: '2.5 MVA emergency blackstart diesel generator set, acoustic enclosure, and auto-transfer switch', status: 'ACTIVE' },

    // Project 3: White Tiger (PRJ-WTG) Packages
    { id: 'pkg-wtg-1', project_id: 'prj-3', name: '25MW Gas Turbine Compressor Skid & Anti-Surge', code: 'WTG-PK-103', description: 'Solar Turbines Titan 130 driver with centrifugal compressor and CCC anti-surge controller', status: 'ACTIVE' },
    { id: 'pkg-wtg-2', project_id: 'prj-3', name: 'Telecom, Industrial PA/GA & Explosion-Proof CCTV', code: 'WTG-PK-203', description: 'PA/GA, explosion-proof CCTV, access control, marine VHF/UHF radio, and fiber optic telemetry', status: 'ACTIVE' },
    { id: 'pkg-wtg-3', project_id: 'prj-3', name: 'Fuel Gas Conditioning & High-Pressure Scrubber', code: 'WTG-PK-303', description: 'Superheater, coalescing filter-separators, and automatic condensate blowdown control valves', status: 'ACTIVE' },
    { id: 'pkg-wtg-4', project_id: 'prj-3', name: 'Machinery Protection & Vibration System (Bently Nevada)', code: 'WTG-PK-403', description: 'Proximity probes, accelerometers, Bently Nevada 3500 rack, and transient data interface', status: 'ACTIVE' },
  ];

  for (const p of packages) {
    run(
      'INSERT OR REPLACE INTO packages (id, project_id, name, code, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.project_id, p.name, p.code, p.description, p.status, formatIso(now), formatIso(now)]
    );
  }

  // 5. Seed Tags
  const tags = [
    { id: 'tag-1', name: 'Vendor', color: '#3b82f6' },
    { id: 'tag-2', name: 'TBE', color: '#ef4444' },
    { id: 'tag-3', name: 'Datasheet', color: '#10b981' },
    { id: 'tag-4', name: 'GADrawing', color: '#6366f1' },
    { id: 'tag-5', name: 'NOC', color: '#f97316' },
    { id: 'tag-6', name: 'Urgent', color: '#dc2626' },
    { id: 'tag-7', name: 'FollowUp', color: '#eab308' },
    { id: 'tag-8', name: 'LongLead', color: '#ec4899' },
    { id: 'tag-9', name: 'Clarification', color: '#06b6d4' },
    { id: 'tag-10', name: 'FAT', color: '#84cc16' },
    { id: 'tag-11', name: 'HAZOP', color: '#a855f7' },
  ];

  for (const t of tags) {
    run(
      'INSERT OR REPLACE INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
      [t.id, t.name, t.color, formatIso(now)]
    );
  }

  // 6. Realistic Engineering Tasks Across All 3 Projects & 12 Distinct Packages
  const taskSeeds = [
    // ==========================================
    // PROJECT 1: BLOCK B GAS FACILITY (PRJ-B01)
    // ==========================================
    {
      id: 'tsk-b01-101',
      projectId: 'prj-1',
      title: 'Review Emerson metering skid GA drawing and nozzle orientation',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-b01-1',
      priority: 'CRITICAL',
      status: 'IN PROGRESS',
      progress: 60,
      startDate: addDays(-8),
      deadline: addDays(-2),
      forecastFinish: addDays(1),
      assigneeId: 'usr-1',
      description: 'Check skid base structural footprint against civil foundation loads. Verify sampling probe nozzle elevation and inlet/outlet spool straight run requirements per AGA-9 standard.',
      tags: ['tag-1', 'tag-4', 'tag-6'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Created task for Emerson Metering Skid GA review based on Rev B submission', daysAgo: 8 },
        { type: 'STATUS_CHANGED', user_id: 'usr-1', oldVal: 'TODO', newVal: 'IN PROGRESS', note: 'Started checking nozzle loads and straight pipe run requirements', daysAgo: 6 },
        { type: 'PROGRESS_CHANGED', user_id: 'usr-1', oldVal: '0%', newVal: '60%', note: 'Completed hydraulic sizing review; pending civil clearance feedback', daysAgo: 2 },
      ],
      comments: [
        { user_id: 'usr-1', content: 'Checked nozzle N1 & N2 elevation. Found 45mm discrepancy with piping isometric Rev 02. Flagged to Emerson for correction.', hoursAgo: 28 },
      ]
    },
    {
      id: 'tsk-b01-102',
      projectId: 'prj-1',
      title: 'Prepare Technical Bid Evaluation (TBE) for ESD Ball Valves',
      type: 'TASK',
      categoryId: 'cat-3',
      packageId: 'pkg-b01-2',
      priority: 'CRITICAL',
      status: 'IN PROGRESS',
      progress: 45,
      startDate: addDays(-10),
      deadline: addDays(-1),
      forecastFinish: addDays(2),
      assigneeId: 'usr-1',
      description: 'Compare Cameron vs Flowserve technical deviations on SIL-3 pneumatic actuator stroke time (under 3.0 seconds required) and fire-safe testing certification (API 607).',
      tags: ['tag-2', 'tag-6', 'tag-1'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Initiated Technical Bid Evaluation for critical ESD valves', daysAgo: 10 },
        { type: 'PRIORITY_CHANGED', user_id: 'usr-1', oldVal: 'HIGH', newVal: 'CRITICAL', note: 'Escalated to Critical due to actuator stroke time constraints', daysAgo: 4 },
        { type: 'PROGRESS_CHANGED', user_id: 'usr-1', oldVal: '20%', newVal: '45%', note: 'Cameron evaluation complete; reviewing Flowserve SIL certificate', daysAgo: 1 },
      ],
      comments: [
        { user_id: 'usr-1', content: 'Cameron complies with 2.8s closing time with quick exhaust valves. Flowserve quoted 3.4s without boosters.', hoursAgo: 14 }
      ]
    },
    {
      id: 'tsk-b01-103',
      projectId: 'prj-1',
      title: 'Check valve TBE comments from Piping Discipline',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-b01-2',
      priority: 'HIGH',
      status: 'TODO',
      progress: 0,
      startDate: addDays(-4),
      deadline: addDays(-1),
      forecastFinish: addDays(1),
      assigneeId: 'usr-1',
      description: 'Piping lead flagged flange face finish (125-250 AARH) for high pressure duplex stainless steel valves. Cross-check with project piping specification Rev C.',
      tags: ['tag-2', 'tag-5'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Task created following Piping Squad Check transmittal', daysAgo: 4 },
      ]
    },
    {
      id: 'tsk-b01-104',
      projectId: 'prj-1',
      title: 'Review vendor valve datasheet for cryogenic service control valves',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-b01-2',
      priority: 'CRITICAL',
      status: 'IN PROGRESS',
      progress: 75,
      startDate: addDays(-4),
      deadline: addDays(0),
      forecastFinish: addDays(0),
      assigneeId: 'usr-1',
      description: 'Verify extended bonnet length, fugitive emission gland packing class A, and Cv calculation at minimum and maximum operating cases.',
      tags: ['tag-1', 'tag-3', 'tag-6'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Received vendor datasheet submission Rev 01', daysAgo: 4 },
        { type: 'PROGRESS_CHANGED', user_id: 'usr-1', oldVal: '0%', newVal: '75%', note: 'Calculations verified; adding markup on bonnet extension drawing', daysAgo: 0 },
      ]
    },
    {
      id: 'tsk-b01-105',
      projectId: 'prj-1',
      title: 'Reply to vendor comment on flow computer Modbus TCP communication interface',
      type: 'TASK',
      categoryId: 'cat-3',
      packageId: 'pkg-b01-1',
      priority: 'HIGH',
      status: 'IN PROGRESS',
      progress: 50,
      startDate: addDays(-2),
      deadline: addDays(0),
      forecastFinish: addDays(0),
      assigneeId: 'usr-1',
      description: 'Vendor requested whether DCS or Flow Computer acts as Modbus Master on dual redundant RS-485 / Ethernet lines. Confirm DCS is Client/Master.',
      tags: ['tag-1', 'tag-9'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Technical query logged from Emerson Systems team', daysAgo: 2 },
        { type: 'PROGRESS_CHANGED', user_id: 'usr-1', oldVal: '0%', newVal: '50%', note: 'Drafted architecture diagram with DCS interface specs', daysAgo: 0 },
      ]
    },
    {
      id: 'tsk-b01-106',
      projectId: 'prj-1',
      title: 'Review metering package analyzer shelter HVAC and hazardous area classification',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-b01-1',
      priority: 'HIGH',
      status: 'IN PROGRESS',
      progress: 40,
      startDate: addDays(-3),
      deadline: addDays(1),
      forecastFinish: addDays(1),
      assigneeId: 'usr-1',
      description: 'Ensure analyzer shelter positive pressurization (NFPA 496 Type X purging) with automatic fail-safe shutdown interlock to DCS.',
      tags: ['tag-1', 'tag-3'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Created review task for Analyzer Shelter HVAC & Safety Interlocks', daysAgo: 3 },
      ]
    },
    {
      id: 'tsk-b01-107',
      projectId: 'prj-1',
      title: 'Check ICSS Fire & Gas cause & effect logic matrix Rev B',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-b01-3',
      priority: 'HIGH',
      status: 'IN PROGRESS',
      progress: 35,
      startDate: addDays(-1),
      deadline: addDays(5),
      forecastFinish: addDays(5),
      assigneeId: 'usr-1',
      description: 'Validate executive actions for toxic H2S gas detection: deluge valve activation, HVAC damper trip, and acoustic beacon alarm sequences.',
      tags: ['tag-5', 'tag-11'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Received F&G C&E matrix update from Safety discipline', daysAgo: 1 },
      ]
    },
    {
      id: 'tsk-b01-108',
      projectId: 'prj-1',
      title: 'Verify subsea PLEM pressure transmitter sour service metallurgy',
      type: 'TASK',
      categoryId: 'cat-3',
      packageId: 'pkg-b01-4',
      priority: 'MEDIUM',
      status: 'WAITING',
      progress: 20,
      startDate: addDays(-4),
      deadline: addDays(6),
      forecastFinish: addDays(7),
      assigneeId: 'usr-1',
      description: 'Awaiting vendor confirmation regarding Inconel 625 weld overlay on 316L SS flanged sensors for 10,000 PSI subsea deepwater service.',
      tags: ['tag-8', 'tag-1'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Clarification query logged with TechnipFMC', daysAgo: 4 },
      ]
    },
    {
      id: 'tsk-b01-109',
      projectId: 'prj-1',
      title: 'Issue TBE for Ultrasonic Gas Metering Skid to Procurement Team',
      type: 'TASK',
      categoryId: 'cat-1',
      packageId: 'pkg-b01-1',
      priority: 'CRITICAL',
      status: 'DONE',
      progress: 100,
      startDate: addDays(-20),
      deadline: addDays(-5),
      forecastFinish: addDays(-5),
      completedDate: addDays(-5),
      assigneeId: 'usr-1',
      description: 'Completed technical evaluation between Emerson Daniel and SICK. Recommended award to Emerson Daniel based on ultrasonic transducer proven track record and lower measurement uncertainty.',
      tags: ['tag-2', 'tag-1'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Initiated Metering Skid TBE review', daysAgo: 20 },
        { type: 'STATUS_CHANGED', user_id: 'usr-1', oldVal: 'IN PROGRESS', newVal: 'DONE', note: 'TBE signed off and formally issued to Procurement Committee', daysAgo: 5 },
      ]
    },
    {
      id: 'tsk-b01-110',
      projectId: 'prj-1',
      title: 'Review safety relief valve (PSV) sizing calculation sheet from Process',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-b01-2',
      priority: 'HIGH',
      status: 'DONE',
      progress: 100,
      startDate: addDays(-14),
      deadline: addDays(-4),
      forecastFinish: addDays(-4),
      completedDate: addDays(-4),
      assigneeId: 'usr-1',
      description: 'Verified fire case and blocked outlet relieving flow rates against API 520 / API 526 standard orifice sizes (D through T orifice).',
      tags: ['tag-3'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Received calculation package from Process discipline', daysAgo: 14 },
        { type: 'STATUS_CHANGED', user_id: 'usr-1', oldVal: 'IN PROGRESS', newVal: 'DONE', note: 'Signed off relief load sizing verification', daysAgo: 4 },
      ]
    },

    // ==========================================
    // PROJECT 2: LAC DA VANG FIELD (PRJ-LDV)
    // ==========================================
    {
      id: 'tsk-ldv-201',
      projectId: 'prj-2',
      title: 'Follow up long lead Coriolis mass flow sensors delivery with Yokogawa',
      type: 'FOLLOW-UP',
      categoryId: 'cat-3',
      packageId: 'pkg-ldv-2',
      priority: 'HIGH',
      status: 'WAITING',
      progress: 30,
      startDate: addDays(-6),
      deadline: addDays(-3),
      forecastFinish: addDays(3),
      assigneeId: 'usr-1',
      description: 'Waiting for Yokogawa Tokyo manufacturing slot confirmation for Coriolis mass flow sensors (Hastelloy C-276 tubes). Need revised ex-factory date.',
      tags: ['tag-1', 'tag-8', 'tag-7'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Expediting action item created after weekly procurement sync', daysAgo: 6 },
        { type: 'STATUS_CHANGED', user_id: 'usr-1', oldVal: 'IN PROGRESS', newVal: 'WAITING', note: 'Awaiting formal manufacturing slot letter from Yokogawa Japan', daysAgo: 3 },
      ],
      comments: [
        { user_id: 'usr-1', content: 'Sent reminder to Yokogawa account manager. Promised reply by 17:00 today.', hoursAgo: 8 }
      ]
    },
    {
      id: 'tsk-ldv-202',
      projectId: 'prj-2',
      title: 'Attend technical clarification meeting with ABB regarding UPS sizing calculation',
      type: 'TASK',
      categoryId: 'cat-2',
      packageId: 'pkg-ldv-3',
      priority: 'HIGH',
      status: 'TODO',
      progress: 0,
      startDate: addDays(-1),
      deadline: addDays(0),
      forecastFinish: addDays(0),
      assigneeId: 'usr-1',
      description: 'Clarify 30-minute backup battery autonomy calculation under 100% full load plus 20% future spare margin per IEC 60146 standard.',
      tags: ['tag-9', 'tag-8'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Meeting scheduled with ABB Electrical Systems team', daysAgo: 1 },
      ]
    },
    {
      id: 'tsk-ldv-203',
      projectId: 'prj-2',
      title: 'Check pressure and differential pressure transmitter specification sheets',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-ldv-2',
      priority: 'MEDIUM',
      status: 'IN PROGRESS',
      progress: 50,
      startDate: addDays(-3),
      deadline: addDays(2),
      forecastFinish: addDays(2),
      assigneeId: 'usr-1',
      description: 'Confirm wetted materials (Monel diaphragm for sour gas service, 316L SS process flange) and overpressure limit ratings.',
      tags: ['tag-3', 'tag-7'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Started verification of 85 instrument datasheets', daysAgo: 3 },
      ]
    },
    {
      id: 'tsk-ldv-204',
      projectId: 'prj-2',
      title: 'Prepare technical clarification sheet for switchgear vendor (Siemens)',
      type: 'TASK',
      categoryId: 'cat-1',
      packageId: 'pkg-ldv-3',
      priority: 'HIGH',
      status: 'TODO',
      progress: 0,
      startDate: addDays(-1),
      deadline: addDays(2),
      forecastFinish: addDays(2),
      assigneeId: 'usr-1',
      description: 'Request clarification on internal arc classification (IAC AFLR 31.5kA 1s) and vacuum circuit breaker spring charging motor voltages.',
      tags: ['tag-9', 'tag-2'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Drafting queries regarding Siemens medium-voltage switchgear', daysAgo: 1 },
      ]
    },
    {
      id: 'tsk-ldv-205',
      projectId: 'prj-2',
      title: 'Review WHP-A Wellhead Control Panel hydraulic accumulator sizing',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-ldv-1',
      priority: 'CRITICAL',
      status: 'IN PROGRESS',
      progress: 65,
      startDate: addDays(-3),
      deadline: addDays(3),
      forecastFinish: addDays(3),
      assigneeId: 'usr-1',
      description: 'Check high pressure (10,000 psi) and low pressure (3,000 psi) accumulator bottle volumes for 3 consecutive valve closures without pump assist.',
      tags: ['tag-1', 'tag-6'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Received vendor accumulator calculations Rev 02', daysAgo: 3 },
      ]
    },
    {
      id: 'tsk-ldv-206',
      projectId: 'prj-2',
      title: 'Verify Emergency Diesel Generator acoustic enclosure & exhaust silencer specs',
      type: 'TASK',
      categoryId: 'cat-3',
      packageId: 'pkg-ldv-4',
      priority: 'MEDIUM',
      status: 'WAITING',
      progress: 15,
      startDate: addDays(-2),
      deadline: addDays(8),
      forecastFinish: addDays(9),
      assigneeId: 'usr-1',
      description: 'Verify sound attenuation to 85 dBA at 1 meter, spark arrestor certification, and fuel day tank automatic transfer instrumentation.',
      tags: ['tag-1', 'tag-7'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Created vendor review task for Caterpillar EDG package', daysAgo: 2 },
      ]
    },
    {
      id: 'tsk-ldv-207',
      projectId: 'prj-2',
      title: 'Sign off Kick-Off Meeting (KOM) minutes for Electrical Package with Siemens',
      type: 'TASK',
      categoryId: 'cat-2',
      packageId: 'pkg-ldv-3',
      priority: 'MEDIUM',
      status: 'DONE',
      progress: 100,
      startDate: addDays(-12),
      deadline: addDays(-8),
      forecastFinish: addDays(-8),
      completedDate: addDays(-8),
      assigneeId: 'usr-1',
      description: 'Agreed on SDRL schedule, 10-day document review turnaround time, and manufacturing quality control plan hold points.',
      tags: ['tag-1'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Minutes of Meeting compiled from 2-day technical KOM', daysAgo: 12 },
        { type: 'STATUS_CHANGED', user_id: 'usr-1', oldVal: 'IN PROGRESS', newVal: 'DONE', note: 'Signed by PTSC Project Team and Siemens Lead PM', daysAgo: 8 },
      ]
    },
    {
      id: 'tsk-ldv-208',
      projectId: 'prj-2',
      title: 'Complete Technical Evaluation for Topside Multiphase Flowmeters',
      type: 'TASK',
      categoryId: 'cat-1',
      packageId: 'pkg-ldv-2',
      priority: 'HIGH',
      status: 'DONE',
      progress: 100,
      startDate: addDays(-15),
      deadline: addDays(-6),
      forecastFinish: addDays(-6),
      completedDate: addDays(-6),
      assigneeId: 'usr-1',
      description: 'Scored Roxar vs Schlumberger Vx multiphase gamma-ray meters. Recommended Roxar based on lower gamma source activity requirements.',
      tags: ['tag-2', 'tag-1'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'TBE completed and approved', daysAgo: 15 },
      ]
    },

    // ==========================================
    // PROJECT 3: WHITE TIGER COMPRESSION (PRJ-WTG)
    // ==========================================
    {
      id: 'tsk-wtg-301',
      projectId: 'prj-3',
      title: 'Issue engineering comment sheet on Telecom PA/GA System Block Diagram',
      type: 'TASK',
      categoryId: 'cat-1',
      packageId: 'pkg-wtg-2',
      priority: 'MEDIUM',
      status: 'TODO',
      progress: 0,
      startDate: addDays(-2),
      deadline: addDays(0),
      forecastFinish: addDays(0),
      assigneeId: 'usr-1',
      description: 'Check acoustic coverage in compressor shelter zone. Sound pressure level must achieve +10 dBA above ambient noise level (minimum 85 dBA).',
      tags: ['tag-4', 'tag-5'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Received vendor drawing transmittal for PA/GA architecture', daysAgo: 2 },
      ]
    },
    {
      id: 'tsk-wtg-302',
      projectId: 'prj-3',
      title: 'Review CCTV camera field of view and hazardous area Ex d certification',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-wtg-2',
      priority: 'MEDIUM',
      status: 'IN PROGRESS',
      progress: 30,
      startDate: addDays(-2),
      deadline: addDays(3),
      forecastFinish: addDays(3),
      assigneeId: 'usr-1',
      description: 'Check optical zoom coverage for wellhead platform area and flare tip thermal monitoring camera resolution.',
      tags: ['tag-1', 'tag-4'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Received camera layout drawing Rev 01', daysAgo: 2 },
      ]
    },
    {
      id: 'tsk-wtg-303',
      projectId: 'prj-3',
      title: 'Review Solar Turbines Titan 130 anti-surge valve dynamic response curve',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-wtg-1',
      priority: 'CRITICAL',
      status: 'IN PROGRESS',
      progress: 70,
      startDate: addDays(-5),
      deadline: addDays(2),
      forecastFinish: addDays(2),
      assigneeId: 'usr-1',
      description: 'Verify 0.8 second fast-opening stroke speed, quick exhaust valve arrangement, and noise attenuation trim (-30 dBA) under full surge recycle conditions.',
      tags: ['tag-1', 'tag-6'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Anti-surge dynamic model received from CCC / Solar', daysAgo: 5 },
      ]
    },
    {
      id: 'tsk-wtg-304',
      projectId: 'prj-3',
      title: 'Check fuel gas scrubber level control valve sizing for transient slug flow',
      type: 'TASK',
      categoryId: 'cat-3',
      packageId: 'pkg-wtg-3',
      priority: 'HIGH',
      status: 'WAITING',
      progress: 40,
      startDate: addDays(-3),
      deadline: addDays(5),
      forecastFinish: addDays(6),
      assigneeId: 'usr-1',
      description: 'Awaiting Process simulation confirmation on liquid hold-up volume during turbine startup transient case.',
      tags: ['tag-3', 'tag-7'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Logged query with Process Engineering Lead', daysAgo: 3 },
      ]
    },
    {
      id: 'tsk-wtg-305',
      projectId: 'prj-3',
      title: 'Verify Bently Nevada 3500 rack sensor arrangement on compressor bearing journals',
      type: 'TASK',
      categoryId: 'cat-5',
      packageId: 'pkg-wtg-4',
      priority: 'HIGH',
      status: 'TODO',
      progress: 0,
      startDate: addDays(-1),
      deadline: addDays(6),
      forecastFinish: addDays(6),
      assigneeId: 'usr-1',
      description: 'Check X-Y orthogonal proximity probe mounting brackets, Keyphasor phase reference probe, and thrust bearing dual redundant axial position sensors per API 670.',
      tags: ['tag-1', 'tag-3'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Review initiated for Bently Nevada 3500 layout', daysAgo: 1 },
      ]
    },
    {
      id: 'tsk-wtg-306',
      projectId: 'prj-3',
      title: 'Milestone: Sign off Turbomachinery Factory Acceptance Test (FAT) Protocol',
      type: 'MILESTONE',
      categoryId: 'cat-1',
      packageId: 'pkg-wtg-1',
      priority: 'CRITICAL',
      status: 'DONE',
      progress: 100,
      startDate: addDays(-18),
      deadline: addDays(-7),
      forecastFinish: addDays(-7),
      completedDate: addDays(-7),
      assigneeId: 'usr-1',
      description: 'Approved comprehensive 4-point string test protocol, mechanical running test (MRT), and aerodynamic performance test per ASME PTC 10.',
      tags: ['tag-10', 'tag-6'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'FAT procedure approved and signed off', daysAgo: 18 },
      ]
    },
    {
      id: 'tsk-wtg-307',
      projectId: 'prj-3',
      title: 'Approve telecommunication fiber optic patch panel layout drawing',
      type: 'TASK',
      categoryId: 'cat-1',
      packageId: 'pkg-wtg-2',
      priority: 'LOW',
      status: 'DONE',
      progress: 100,
      startDate: addDays(-10),
      deadline: addDays(-3),
      forecastFinish: addDays(-3),
      completedDate: addDays(-3),
      assigneeId: 'usr-1',
      description: 'Approved 24-core singlemode fiber optic splice tray and breakout box enclosure drawing for platform telecom bridge.',
      tags: ['tag-4'],
      activities: [
        { type: 'TASK_CREATED', user_id: 'usr-1', note: 'Drawing approved code 1 without comments', daysAgo: 10 },
      ]
    },
  ];

  for (let i = 0; i < taskSeeds.length; i++) {
    const s = taskSeeds[i];
    const createdAt = formatIso(new Date(Date.now() - (15 - (i % 10)) * 86400000));
    const updatedAt = formatIso(now);

    const picMapping: Record<string, string[]> = {
      'tsk-b01-110': ['Nguyen Van An'],
      'tsk-wtg-301': ['Pham Hoang Nam', 'Le Thi Mai'],
      'tsk-ldv-208': ['Pham Hoang Nam', 'Bui Anh Tuan'],
      'tsk-b01-108': ['Pham Hoang Nam', 'Vu Quoc Bao'],
      'tsk-ldv-207': ['Pham Hoang Nam', 'Ho Quoc Viet (Tôi)'],
      'tsk-b01-107': ['Pham Hoang Nam', 'Vu Quoc Bao'],
      'tsk-ldv-206': ['Tran Minh Duc', 'Vu Quoc Bao'],
      'tsk-b01-106': ['Pham Hoang Nam', 'Tran Minh Duc'],
      'tsk-wtg-307': ['Pham Hoang Nam', 'Le Thi Mai'],
      'tsk-b01-105': ['Pham Hoang Nam', 'Doan Tan Phat'],
      'tsk-wtg-306': ['Doan Tan Phat', 'Vu Quoc Bao', 'Ho Quoc Viet (Tôi)'],
      'tsk-ldv-204': ['Pham Hoang Nam', 'Bui Anh Tuan'],
      'tsk-b01-104': ['Nguyen Van An', 'Ho Quoc Viet (Tôi)'],
      'tsk-wtg-305': ['Pham Hoang Nam', 'Vu Quoc Bao'],
      'tsk-ldv-203': ['Pham Hoang Nam', 'Le Thi Mai'],
      'tsk-b01-103': ['Nguyen Van An', 'Bui Anh Tuan'],
      'tsk-wtg-304': ['Nguyen Van An', 'Pham Hoang Nam'],
      'tsk-ldv-202': ['Pham Hoang Nam', 'Ho Quoc Viet (Tôi)'],
      'tsk-b01-102': ['Nguyen Van An', 'Bui Anh Tuan'],
      'tsk-wtg-303': ['Nguyen Van An', 'Doan Tan Phat'],
      'tsk-ldv-201': ['Pham Hoang Nam', 'Bui Anh Tuan'],
    };
    const taskPics = picMapping[s.id] || ['Ho Quoc Viet (Tôi)'];

    run(
      `INSERT INTO tasks (
        id, project_id, title, description, type, category_id, package_id, priority, status,
        progress, start_date, deadline, forecast_finish, completed_date, assignee_id, pics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.projectId,
        s.title,
        s.description,
        s.type,
        s.categoryId,
        s.packageId,
        s.priority,
        s.status,
        s.progress,
        s.startDate,
        s.deadline,
        s.forecastFinish || null,
        s.completedDate || null,
        'usr-1',
        JSON.stringify(taskPics),
        createdAt,
        updatedAt,
      ]
    );

    // Insert task tags
    if (s.tags && s.tags.length > 0) {
      for (const tagId of s.tags) {
        run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [s.id, tagId]);
      }
    }

    // Insert activities
    if (s.activities && s.activities.length > 0) {
      for (const act of s.activities as any[]) {
        const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
        const actTime = formatIso(new Date(Date.now() - act.daysAgo * 86400000));
        run(
          'INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [actId, s.id, 'usr-1', act.type, act.field || null, act.oldVal || null, act.newVal || null, act.note, actTime]
        );
      }
    } else {
      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(
        'INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [actId, s.id, 'usr-1', 'TASK_CREATED', null, null, null, 'Task created in system', createdAt]
      );
    }

    // Insert comments
    if (s.comments && s.comments.length > 0) {
      for (const c of s.comments) {
        const cmtId = `cmt-${crypto.randomUUID().slice(0, 8)}`;
        const cmtTime = formatIso(new Date(Date.now() - c.hoursAgo * 3600000));
        run(
          'INSERT INTO task_comments (id, task_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
          [cmtId, s.id, 'usr-1', c.content, cmtTime]
        );
      }
    }
  }

  console.log(`Seeded ${taskSeeds.length} engineering tasks with projects, packages, and full activity logs successfully.`);
}
