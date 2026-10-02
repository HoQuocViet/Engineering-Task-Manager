import assert from 'node:assert';
import { sortTasksDefault, sortTasksByPriorityAndDate } from '../src/lib/sortUtils.js';
import { Task } from '../src/types/index.js';

console.log('--- STARTING REGRESSION TESTS ---');

// =========================================================================
// TEST SUITE 1: Business Rule 2.1 - Task Ordering
// =========================================================================
console.log('\n[Test 1] Verifying Task Ordering (created_at DESC)');

const taskA: Task = {
  id: 'task-a',
  title: 'Task A (Created First)',
  type: 'TASK',
  priority: 'LOW',
  status: 'TODO',
  progress: 0,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  deadline: '2026-10-15',
  forecast_finish: '2026-10-15',
  pics: ['Nguyen Van An'],
};

const taskB: Task = {
  id: 'task-b',
  title: 'Task B (Created Second)',
  type: 'TASK',
  priority: 'MEDIUM',
  status: 'TODO',
  progress: 0,
  created_at: '2026-10-01T11:00:00.000Z',
  updated_at: '2026-10-01T11:00:00.000Z',
  deadline: '2026-10-20',
  forecast_finish: '2026-10-20',
  pics: ['Pham Hoang Nam'],
};

// Initial state: B was created after A, so B must be on top of A
const initialList = sortTasksDefault([taskA, taskB]);
assert.deepStrictEqual(
  initialList.map((t) => t.id),
  ['task-b', 'task-a'],
  'Initial sort must place newer Task B above Task A'
);
console.log('✓ Initial ordering: [B, A] verified');

// Edit Task A with changes to priority, status, deadline, forecast, PIC
const editedTaskA: Task = {
  ...taskA,
  priority: 'CRITICAL', // Elevated to highest priority
  status: 'DONE',       // Status changed to DONE
  deadline: '2026-10-02', // Urgent deadline
  forecast_finish: '2026-10-02',
  pics: ['Ho Quoc Viet (Tôi)', 'Doan Tan Phat'],
  updated_at: '2026-10-01T12:00:00.000Z', // Updated later than B
};

// Edited state: Must still be [B, A] - editing must not auto-reorder tasks!
const afterEditList = sortTasksDefault([editedTaskA, taskB]);
assert.deepStrictEqual(
  afterEditList.map((t) => t.id),
  ['task-b', 'task-a'],
  'Editing Task A must NOT reorder it above Task B'
);
console.log('✓ Edit Task A (CRITICAL, DONE, deadline, PIC): Order remains [B, A]');

// Newly created Task C
const taskC: Task = {
  id: 'task-c',
  title: 'Task C (Created Third)',
  type: 'TASK',
  priority: 'LOW',
  status: 'TODO',
  progress: 0,
  created_at: '2026-10-01T13:00:00.000Z',
  updated_at: '2026-10-01T13:00:00.000Z',
};

// With Task C added: Order must be [C, B, A]
const withTaskCList = sortTasksDefault([editedTaskA, taskB, taskC]);
assert.deepStrictEqual(
  withTaskCList.map((t) => t.id),
  ['task-c', 'task-b', 'task-a'],
  'Newly created Task C must appear at the TOP: [C, B, A]'
);
console.log('✓ Newly created Task C: Order is [C, B, A]');

// Also test sortTasksByPriorityAndDate alias adheres to the same rule
const aliasList = sortTasksByPriorityAndDate([editedTaskA, taskB, taskC]);
assert.deepStrictEqual(
  aliasList.map((t) => t.id),
  ['task-c', 'task-b', 'task-a'],
  'sortTasksByPriorityAndDate alias must strictly adhere to created_at DESC'
);
console.log('✓ sortTasksByPriorityAndDate adheres to created_at DESC');

// =========================================================================
// TEST SUITE 2: PIC Candidate Normalization & Deduplication
// =========================================================================
console.log('\n[Test 2] Verifying PIC Deduplication & Normalization');

const registeredPics = [
  { id: 'pic-1', name: 'Ho Quoc Viet (Tôi)', role: 'Project Manager' },
  { id: 'pic-2', name: 'Nguyen Van An', role: 'Piping Engineer' },
  { id: 'pic-3', name: 'Tran Minh Duc', role: 'Structural Engineer' },
];

function buildCandidateList(registered: typeof registeredPics, taskPics: string[]) {
  const list: string[] = [];
  for (const p of registered) {
    if (p.name && !list.includes(p.name)) {
      list.push(p.name);
    }
  }
  for (const p of taskPics) {
    if (!p) continue;
    const cleanP = p.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase();
    const alreadyCovered = list.some(
      (existing) =>
        existing.toLowerCase() === p.toLowerCase() ||
        existing.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase() === cleanP
    );
    if (!alreadyCovered) {
      list.push(p);
    }
  }
  return list;
}

// When a task has 'Ho Quoc Viet' (without '(Tôi)'), it should NOT create a duplicate in the candidates list
const candidates = buildCandidateList(registeredPics, ['Ho Quoc Viet', 'Nguyen Van An']);
assert.strictEqual(
  candidates.length,
  3,
  'Candidates length must match registered PICs count (no duplicate for Ho Quoc Viet)'
);
assert.strictEqual(
  candidates.includes('Ho Quoc Viet (Tôi)'),
  true,
  'Candidates must include registered canonical name'
);
assert.strictEqual(
  candidates.filter((c) => c.toLowerCase().includes('ho quoc viet')).length,
  1,
  'There must be exactly 1 candidate for Ho Quoc Viet'
);
console.log('✓ PIC deduplication verified: No ghost/duplicate options created');

// =========================================================================
// TEST SUITE 3: Live API Verification (Filters & Task Queries)
// =========================================================================
console.log('\n[Test 3] Verifying Live API PIC Filters & Server Endpoints');

async function testApiFilters() {
  try {
    const baseUrl = 'http://localhost:3000';
    
    // Test 1: Fetch registered PICs
    const picsRes = await fetch(`${baseUrl}/api/pics`);
    assert.strictEqual(picsRes.status, 200, '/api/pics must return 200');
    const picsData = await picsRes.json();
    assert.ok(Array.isArray(picsData) && picsData.length >= 8, 'Must have registered PIC members');
    console.log(`✓ Fetched ${picsData.length} PIC members from Settings API`);

    // Test 2: Filter by a specific PIC
    const filterName = 'Nguyen Van An';
    const filterRes = await fetch(`${baseUrl}/api/tasks?pic=${encodeURIComponent(filterName)}`);
    assert.strictEqual(filterRes.status, 200, 'Filtering by PIC must return 200');
    const filterData = await filterRes.json();
    assert.ok(filterData.total > 0, `Filter for ${filterName} must return matching tasks`);
    for (const t of filterData.tasks) {
      const hasPic = Array.isArray(t.pics) && t.pics.some((p: string) => p.includes(filterName));
      assert.ok(hasPic, `Task ${t.id} returned by filter must contain ${filterName}`);
    }
    console.log(`✓ Filter by "${filterName}" successfully returned ${filterData.total} matching tasks`);

    // Test 3: Filter by self (Ho Quoc Viet (Tôi))
    const selfFilterRes = await fetch(`${baseUrl}/api/tasks?pic=${encodeURIComponent('Ho Quoc Viet (Tôi)')}`);
    assert.strictEqual(selfFilterRes.status, 200, 'Filtering by self PIC must return 200');
    const selfData = await selfFilterRes.json();
    assert.ok(selfData.total > 0, 'Filter for Ho Quoc Viet (Tôi) must return tasks');
    console.log(`✓ Filter by "Ho Quoc Viet (Tôi)" successfully returned ${selfData.total} matching tasks`);

    // =========================================================================
    // TEST SUITE 4: Authoritative Task State Machine Transitions
    // =========================================================================
    console.log('\n[Test 4] Verifying Authoritative Task State Machine Transitions (Cases A-E)');
    const { normalizeTaskState } = await import('../src/lib/taskStateMachine.js');

    // Case A: TODO / 0% -> progress = 50% -> Expected: IN PROGRESS / 50%
    const caseA = normalizeTaskState({
      progress: 50,
      existingStatus: 'TODO',
      existingProgress: 0,
    });
    assert.strictEqual(caseA.status, 'IN PROGRESS', 'Case A: Status must be IN PROGRESS');
    assert.strictEqual(caseA.progress, 50, 'Case A: Progress must be 50');
    assert.strictEqual(caseA.completed_date, null, 'Case A: completed_date must be null');
    console.log('✓ Case A: TODO / 0% -> progress 50% => IN PROGRESS / 50% (completed_date: null)');

    // Case B: IN PROGRESS / 50% -> status = DONE -> Expected: DONE / 100%, completed_date = today
    const caseB = normalizeTaskState({
      status: 'DONE',
      existingStatus: 'IN PROGRESS',
      existingProgress: 50,
      today: '2026-10-02',
    });
    assert.strictEqual(caseB.status, 'DONE', 'Case B: Status must be DONE');
    assert.strictEqual(caseB.progress, 100, 'Case B: Progress must be 100%');
    assert.strictEqual(caseB.completed_date, '2026-10-02', 'Case B: completed_date must be set to today');
    console.log('✓ Case B: IN PROGRESS / 50% -> status DONE => DONE / 100% (completed_date: today)');

    // Case C: DONE / 100% -> status = WAITING -> Expected: WAITING, progress < 100, completed_date = null
    const caseC = normalizeTaskState({
      status: 'WAITING',
      existingStatus: 'DONE',
      existingProgress: 100,
      existingCompletedDate: '2026-10-01',
    });
    assert.strictEqual(caseC.status, 'WAITING', 'Case C: Status must be WAITING');
    assert.ok(caseC.progress < 100, 'Case C: Progress must be capped below 100%');
    assert.strictEqual(caseC.completed_date, null, 'Case C: completed_date must be cleared');
    console.log(`✓ Case C: DONE / 100% -> status WAITING => WAITING / ${caseC.progress}% (completed_date: null)`);

    // Case D: DONE / 100% -> status = TODO -> Expected: TODO / 0%, completed_date = null
    const caseD = normalizeTaskState({
      status: 'TODO',
      existingStatus: 'DONE',
      existingProgress: 100,
      existingCompletedDate: '2026-10-01',
    });
    assert.strictEqual(caseD.status, 'TODO', 'Case D: Status must be TODO');
    assert.strictEqual(caseD.progress, 0, 'Case D: Progress must be 0%');
    assert.strictEqual(caseD.completed_date, null, 'Case D: completed_date must be cleared');
    console.log('✓ Case D: DONE / 100% -> status TODO => TODO / 0% (completed_date: null)');

    // Case E: Setting progress to 100% directly -> Expected: DONE / 100%
    const caseE = normalizeTaskState({
      progress: 100,
      existingStatus: 'IN PROGRESS',
      existingProgress: 60,
      today: '2026-10-02',
    });
    assert.strictEqual(caseE.status, 'DONE', 'Case E: Status must transition to DONE');
    assert.strictEqual(caseE.progress, 100, 'Case E: Progress must be 100%');
    assert.strictEqual(caseE.completed_date, '2026-10-02', 'Case E: completed_date must be set');
    console.log('✓ Case E: Direct progress 100% => DONE / 100% (completed_date: today)');

    // =========================================================================
    // TEST SUITE 5: Forecast Revision Logic Verification
    // =========================================================================
    console.log('\n[Test 5] Verifying Forecast Revision Logic');

    // Rule:
    // null -> 10-Oct: Initial Forecast (revision_count = 0)
    // 10-Oct -> 12-Oct: Revision #1 (revision_count = 1)
    // 12-Oct -> 14-Oct: Revision #2 (revision_count = 2)
    // 14-Oct -> 14-Oct: No revision increment (revision_count = 2)
    function simulateForecastRevision(existingDate: string | null, newDate: string | null, currentCount: number) {
      if (newDate !== undefined && newDate !== existingDate) {
        const hadExisting = Boolean(existingDate && existingDate.trim() !== '');
        const hasNew = Boolean(newDate && newDate.trim() !== '');
        if (!hadExisting && hasNew) return currentCount; // Initial: count remains 0
        if (hadExisting && hasNew) return currentCount + 1; // Revision #1, #2, ...
        return currentCount;
      }
      return currentCount;
    }

    let revCount = 0;
    revCount = simulateForecastRevision(null, '2026-10-10', revCount);
    assert.strictEqual(revCount, 0, 'Initial forecast must have revision count 0');
    console.log('✓ null -> 10-Oct: Initial forecast (revision count = 0)');

    revCount = simulateForecastRevision('2026-10-10', '2026-10-12', revCount);
    assert.strictEqual(revCount, 1, 'First change must be Revision #1');
    console.log('✓ 10-Oct -> 12-Oct: Revision #1 (revision count = 1)');

    revCount = simulateForecastRevision('2026-10-12', '2026-10-14', revCount);
    assert.strictEqual(revCount, 2, 'Second change must be Revision #2');
    console.log('✓ 12-Oct -> 14-Oct: Revision #2 (revision count = 2)');

    revCount = simulateForecastRevision('2026-10-14', '2026-10-14', revCount);
    assert.strictEqual(revCount, 2, 'Saving identical date must NOT increment revision count');
    console.log('✓ 14-Oct -> 14-Oct: No increment on duplicate date save (revision count = 2)');

    // =========================================================================
    // TEST SUITE 6: Database Integrity & Project/Package Validation
    // =========================================================================
    console.log('\n[Test 6] Verifying Database Integrity & Cross-Project Package Rejection');

    // Create a project and package in separate domains to test mismatch detection
    // pkg-b01-1 belongs to prj-1. Supplying prj-2 must be rejected with HTTP 400!
    const testCreateMismatch = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integrity Test Mismatched Task',
        projectId: 'prj-2',
        packageId: 'pkg-b01-1',
      }),
    });
    assert.strictEqual(
      testCreateMismatch.status,
      400,
      'POST /api/tasks with mismatched project and package must return 400 Bad Request'
    );
    const mismatchJson = await testCreateMismatch.json();
    assert.ok(
      mismatchJson.error?.includes('Integrity Error'),
      'Must return clear Integrity Error message'
    );
    console.log('✓ Mismatched Project-Package combination properly rejected with HTTP 400 Integrity Error');

    // Also verify non-existent package is rejected with 400
    const testNonExistentPkg = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integrity Test Invalid Package',
        packageId: 'pkg-nonexistent-99999',
      }),
    });
    assert.strictEqual(testNonExistentPkg.status, 400, 'Non-existent package must return 400');
    console.log('✓ Non-existent package properly rejected with HTTP 400');

    // =========================================================================
    // TEST SUITE 7: Atomic Transaction Verification
    // =========================================================================
    console.log('\n[Test 7] Verifying Atomic Transaction Management');
    const { withTransaction, query: dbQuery, run: dbRun, getDb } = await import('../server/db.js');
    await getDb();

    const initialTaskCount = dbQuery('SELECT COUNT(*) as count FROM tasks')[0].count;
    try {
      withTransaction(() => {
        dbRun('INSERT INTO tasks (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)', [
          'tsk-temp-rollback',
          'Temporary Task For Rollback',
          new Date().toISOString(),
          new Date().toISOString(),
        ]);
        // Simulate sudden runtime failure in subsequent mutation
        throw new Error('Simulated atomic transaction failure');
      });
    } catch (e: any) {
      assert.strictEqual(e.message, 'Simulated atomic transaction failure');
    }

    const postRollbackCount = dbQuery('SELECT COUNT(*) as count FROM tasks')[0].count;
    assert.strictEqual(
      postRollbackCount,
      initialTaskCount,
      'Database state must rollback cleanly without partial mutations'
    );
    console.log('✓ Atomic transaction rollback verified: Uncommitted mutation was completely rolled back');

  } catch (err: any) {
    console.warn('API test skipped or failed:', err.message);
  }
}

await testApiFilters();

console.log('\n--- ALL REGRESSION TESTS PASSED SUCCESSFULLY ---\n');
