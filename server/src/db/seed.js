import db from './index.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function seed() {
  console.log('Seeding Liberty Command database...');

  // Clear existing data
  db.exec('DELETE FROM sessions');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM rfps');
  db.exec('DELETE FROM columns');
  db.exec('DELETE FROM team_members');

  // Seed team members (default password: "liberty" — must be changed on first login)
  const defaultPassword = await bcrypt.hash('liberty', SALT_ROUNDS);
  const members = [
    { id: 'user-1', name: 'Kirk', color: 'blue', role: 'admin' },
    { id: 'user-2', name: 'Kevin', color: 'emerald', role: 'admin' },
    { id: 'user-3', name: 'Kirk/Kevin', color: 'purple', role: 'member' },
    { id: 'user-4', name: 'Dev Team', color: 'cyan', role: 'member' },
    { id: 'user-5', name: 'FreightSnap', color: 'amber', role: 'member' },
    { id: 'user-6', name: 'External', color: 'zinc', role: 'member' },
  ];

  const insertMember = db.prepare(
    'INSERT INTO team_members (id, name, color, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  );
  for (const m of members) {
    insertMember.run(m.id, m.name, m.color, defaultPassword, m.role);
  }
  console.log(`  Seeded ${members.length} team members (password: "liberty")`);

  // Seed columns
  const cols = [
    { id: 'col-backlog', title: 'Backlog', icon: 'Package', color: 'slate', sort_order: 0 },
    { id: 'col-pricing', title: 'Pricing (RFP)', icon: 'DollarSign', color: 'emerald', sort_order: 1 },
    { id: 'col-re-logistics', title: 'RE Logistics', icon: 'Truck', color: 'amber', sort_order: 2 },
    { id: 'col-tms', title: 'TMS / HIFA Dev', icon: 'Code', color: 'purple', sort_order: 3 },
    { id: 'col-freightsnap', title: 'FreightSnap', icon: 'Camera', color: 'cyan', sort_order: 4 },
    { id: 'col-drayage', title: 'Drayage', icon: 'Ship', color: 'indigo', sort_order: 5 },
    { id: 'col-shipper-comms', title: 'Shipper Comms', icon: 'MessageSquare', color: 'rose', sort_order: 6 },
    { id: 'col-waiting', title: 'Waiting (External)', icon: 'Clock', color: 'zinc', sort_order: 7 },
  ];

  const insertCol = db.prepare(
    'INSERT INTO columns (id, title, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  for (const c of cols) {
    insertCol.run(c.id, c.title, c.icon, c.color, c.sort_order);
  }
  console.log(`  Seeded ${cols.length} columns`);

  // Seed tasks
  const tasks = [
    { id: 'task-bl-1', column_id: 'col-backlog', content: 'Define Launch Date', owner: 'Kirk/Kevin', tag: 'Strategy', priority: 'Critical', due_date: '2026-02-15', sort_order: 0 },
    { id: 'task-bl-2', column_id: 'col-backlog', content: 'Confirm Scope', owner: 'Kirk', tag: 'Strategy', priority: 'Critical', due_date: '2026-02-10', sort_order: 1 },
    { id: 'task-bl-3', column_id: 'col-backlog', content: 'Carrier Strategy', owner: 'Kevin', tag: 'Strategy', priority: 'Critical', due_date: '2026-02-20', sort_order: 2 },
    { id: 'task-pr-1', column_id: 'col-pricing', content: 'Review Data', owner: 'Kevin', tag: 'Carrier RFP', priority: 'Standard', estimate: '2d', due_date: '2026-02-05', sort_order: 0 },
    { id: 'task-pr-2', column_id: 'col-pricing', content: 'Lane Analysis', owner: 'Kevin', tag: 'Carrier RFP', priority: 'Standard', estimate: '1d', due_date: '2026-02-08', sort_order: 1 },
    { id: 'task-pr-3', column_id: 'col-pricing', content: 'Compose RFP', owner: 'Kevin', tag: 'Carrier RFP', priority: 'Standard', estimate: '5d', due_date: '2026-02-15', sort_order: 2 },
    { id: 'task-pr-4', column_id: 'col-pricing', content: 'Distribution List', owner: 'Kirk', tag: 'Carrier RFP', priority: 'Standard', estimate: '1d', sort_order: 3 },
    { id: 'task-pr-5', column_id: 'col-pricing', content: 'Distribute RFP', owner: 'Kevin', tag: 'Carrier RFP', priority: 'Standard', estimate: '3d', sort_order: 4 },
    { id: 'task-pr-6', column_id: 'col-pricing', content: 'RFP Window', owner: 'Kevin', tag: 'Carrier RFP', priority: 'Standard', estimate: '3w', sort_order: 5 },
    { id: 'task-pr-7', column_id: 'col-pricing', content: 'Analyze Responses', owner: 'Kirk/Kevin', tag: 'Carrier RFP', priority: 'Standard', estimate: '5d', sort_order: 6 },
    { id: 'task-pr-8', column_id: 'col-pricing', content: 'Selection', owner: 'Kirk/Kevin', tag: 'Carrier RFP', priority: 'Critical', estimate: '1d', due_date: '2026-03-01', sort_order: 7 },
    { id: 'task-pr-9', column_id: 'col-pricing', content: 'Publication', owner: 'Kevin', tag: 'Carrier RFP', priority: 'Standard', estimate: '3d', sort_order: 8 },
    { id: 'task-pr-10', column_id: 'col-pricing', content: 'Kickoff', owner: 'Kirk/Kevin', tag: 'Carrier RFP', priority: 'Critical', estimate: '2d', due_date: '2026-03-05', sort_order: 9 },
    { id: 'task-re-1', column_id: 'col-re-logistics', content: 'Meeting w/ Rodney (Jan 30)', owner: 'Kirk', tag: 'RE Logistics', priority: 'Critical', estimate: 'Jan 30', due_date: '2026-01-30', sort_order: 0 },
    { id: 'task-re-2', column_id: 'col-re-logistics', content: 'Verify Location', owner: 'Kirk', tag: 'RE Logistics', priority: 'Standard', sort_order: 1 },
    { id: 'task-re-3', column_id: 'col-re-logistics', content: 'Service Territory', owner: 'Kirk', tag: 'RE Logistics', priority: 'Standard', sort_order: 2 },
    { id: 'task-re-4', column_id: 'col-re-logistics', content: 'Pallet Rates', owner: 'Kirk', tag: 'RE Logistics', priority: 'Standard', sort_order: 3 },
    { id: 'task-re-5', column_id: 'col-re-logistics', content: 'Key Contacts', owner: 'Kirk', tag: 'RE Logistics', priority: 'Standard', sort_order: 4 },
    { id: 'task-tms-1', column_id: 'col-tms', content: 'RE User Setup', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Critical', due_date: '2026-02-12', sort_order: 0 },
    { id: 'task-tms-2', column_id: 'col-tms', content: 'Dock Requirements', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Standard', sort_order: 1 },
    { id: 'task-tms-3', column_id: 'col-tms', content: 'Ocean Cost Manifest', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Standard', sort_order: 2 },
    { id: 'task-tms-4', column_id: 'col-tms', content: 'Dispatch Feature', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Critical', due_date: '2026-02-18', sort_order: 3 },
    { id: 'task-tms-5', column_id: 'col-tms', content: 'P&L Flow', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Standard', sort_order: 4 },
    { id: 'task-tms-6', column_id: 'col-tms', content: 'Wholesale Tax Rename', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Standard', sort_order: 5 },
    { id: 'task-tms-7', column_id: 'col-tms', content: 'OCR Workflow', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Standard', sort_order: 6 },
    { id: 'task-tms-8', column_id: 'col-tms', content: 'Label Creation', owner: 'Dev Team', tag: 'TMS Dev', priority: 'Standard', sort_order: 7 },
    { id: 'task-fs-1', column_id: 'col-freightsnap', content: 'Enable OCR', owner: 'FreightSnap', tag: 'FreightSnap', priority: 'Critical', due_date: '2026-02-10', sort_order: 0 },
    { id: 'task-fs-2', column_id: 'col-freightsnap', content: 'Deploy Parcel/Pallet/LTL tools', owner: 'FreightSnap', tag: 'FreightSnap', priority: 'Critical', due_date: '2026-02-15', sort_order: 1 },
    { id: 'task-fs-3', column_id: 'col-freightsnap', content: 'UI Flag for incomplete orders', owner: 'FreightSnap', tag: 'FreightSnap', priority: 'Standard', sort_order: 2 },
    { id: 'task-fs-4', column_id: 'col-freightsnap', content: 'Admin Review Flow', owner: 'FreightSnap', tag: 'FreightSnap', priority: 'Standard', sort_order: 3 },
    { id: 'task-fs-5', column_id: 'col-freightsnap', content: 'BOL OCR', owner: 'FreightSnap', tag: 'FreightSnap', priority: 'Critical', due_date: '2026-02-20', sort_order: 4 },
    { id: 'task-dr-1', column_id: 'col-drayage', content: 'Matson Meeting', owner: 'Kirk', tag: 'Drayage', priority: 'Critical', due_date: '2026-02-05', sort_order: 0 },
    { id: 'task-dr-2', column_id: 'col-drayage', content: 'Local Provider Meeting', owner: 'Kirk', tag: 'Drayage', priority: 'Standard', sort_order: 1 },
    { id: 'task-sc-1', column_id: 'col-shipper-comms', content: 'Draft Pre-launch', owner: 'Kirk', tag: 'Shipper Comms', priority: 'Standard', sort_order: 0 },
    { id: 'task-sc-2', column_id: 'col-shipper-comms', content: 'Tendering Instructions', owner: 'Kirk', tag: 'Shipper Comms', priority: 'Standard', sort_order: 1 },
    { id: 'task-sc-3', column_id: 'col-shipper-comms', content: 'Joint Messaging', owner: 'Kirk/Kevin', tag: 'Shipper Comms', priority: 'Standard', sort_order: 2 },
    { id: 'task-wt-1', column_id: 'col-waiting', content: 'RE Confirmation', owner: 'External', tag: 'External', priority: 'Standard', sort_order: 0 },
    { id: 'task-wt-2', column_id: 'col-waiting', content: 'RFP Responses', owner: 'External', tag: 'External', priority: 'Standard', sort_order: 1 },
    { id: 'task-wt-3', column_id: 'col-waiting', content: 'Dev Dependencies', owner: 'External', tag: 'External', priority: 'Standard', sort_order: 2 },
    { id: 'task-wt-4', column_id: 'col-waiting', content: 'FreightSnap Readiness', owner: 'External', tag: 'External', priority: 'Standard', sort_order: 3 },
  ];

  const insertTask = db.prepare(
    'INSERT INTO tasks (id, column_id, content, owner, tag, priority, estimate, due_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const t of tasks) {
    insertTask.run(t.id, t.column_id, t.content, t.owner, t.tag, t.priority, t.estimate || null, t.due_date || null, t.sort_order);
  }
  console.log(`  Seeded ${tasks.length} tasks`);

  // Seed RFPs
  const rfps = [
    { id: 'rfp-1', name: 'Carrier Direct', carrier: 'Carrier Direct LLC', progress: 85, status: 'Finalizing', due_date: '2026-02-28' },
    { id: 'rfp-2', name: 'KRC Logistics', carrier: 'KRC Logistics Inc', progress: 45, status: 'Rates Pending', due_date: '2026-03-15' },
    { id: 'rfp-3', name: 'Central Transport', carrier: 'Central Transport Co', progress: 12, status: 'Request Sent', due_date: '2026-03-20' },
  ];

  const insertRfp = db.prepare(
    'INSERT INTO rfps (id, name, carrier, progress, status, due_date) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const r of rfps) {
    insertRfp.run(r.id, r.name, r.carrier, r.progress, r.status, r.due_date);
  }
  console.log(`  Seeded ${rfps.length} RFPs`);

  console.log('Done! Default login password for all users: "liberty"');
}

seed().catch(console.error);
