// Seed family_week_assignments for marathon 2 (Call of Duty) from the printed schedule.
// Run: node seed-assignments.js

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  'https://asygijgyvplutjujdiic.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeWdpamd5dnBsdXRqdWpkaWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU4MzEzNywiZXhwIjoyMDk1MTU5MTM3fQ.zJy1w4Ziyy5cpTBpj9pNaqJzzFdI_MnGwvigolZ9s1o',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ── Family IDs (from DB) ──────────────────────────────────────────────────────
const F = { Warriors: 18, Guardians: 15, Snippers: 14, Wolves: 16, Rangers: 19, Hunters: 17 };
const ALL = Object.values(F);

// ── Challenge IDs (from DB) ───────────────────────────────────────────────────
const C = {
  abaqira:        25,  // العباقرة          (kahoot)
  escapeRoom:     26,  // Escape Room
  fanni:          27,  // سلاح المهندسين    (الفني / 3d_model)
  contentCreator: 28,  // المبدع الصغير     (content creator / video)
  problemSolving: 29,  // إدارة الأزمة      (problem solving)
  aqeeda:         30,  // خط دفاع العقيدة   (سؤال العقيدة / doctrine)
  bookSummary:    31,  // تلخيص الكتاب      (book_summary)
};

// ── Ensure week 8 exists (July 24) ───────────────────────────────────────────
let { data: w8 } = await db.from('weeks')
  .select('id').eq('marathon_id', 2).eq('week_number', 8).maybeSingle();

if (!w8) {
  const { data, error } = await db.from('weeks')
    .insert({ marathon_id: 2, week_number: 8, start_date: '2026-07-24', end_date: '2026-07-24' })
    .select('id').single();
  if (error) { console.error('Could not create week 8:', error.message); process.exit(1); }
  w8 = data;
  console.log('✓ Created week 8 (id=' + w8.id + ')');
}

// ── Load week IDs ─────────────────────────────────────────────────────────────
const { data: weeks } = await db.from('weeks')
  .select('id, week_number').eq('marathon_id', 2).order('week_number');

const W = Object.fromEntries(weeks.map(w => [w.week_number, w.id]));

// ── Schedule (family_id → challenge_id per week) ──────────────────────────────
// Week 1 is orientation — no mission assignment.

const schedule = [
  // week 2: Warriors+Guardians+Hunters → Problem Solving | Snippers+Wolves+Rangers → العباقرة
  { weekId: W[2], familyId: F.Warriors,  challengeId: C.problemSolving },
  { weekId: W[2], familyId: F.Guardians, challengeId: C.problemSolving },
  { weekId: W[2], familyId: F.Hunters,   challengeId: C.problemSolving },
  { weekId: W[2], familyId: F.Snippers,  challengeId: C.abaqira },
  { weekId: W[2], familyId: F.Wolves,    challengeId: C.abaqira },
  { weekId: W[2], familyId: F.Rangers,   challengeId: C.abaqira },

  // week 3: swap — Warriors+Guardians+Hunters → العباقرة | Snippers+Wolves+Rangers → Problem Solving
  { weekId: W[3], familyId: F.Warriors,  challengeId: C.abaqira },
  { weekId: W[3], familyId: F.Guardians, challengeId: C.abaqira },
  { weekId: W[3], familyId: F.Hunters,   challengeId: C.abaqira },
  { weekId: W[3], familyId: F.Snippers,  challengeId: C.problemSolving },
  { weekId: W[3], familyId: F.Wolves,    challengeId: C.problemSolving },
  { weekId: W[3], familyId: F.Rangers,   challengeId: C.problemSolving },

  // week 4: Warriors+Guardians+Hunters → تلخيص الكتاب | Snippers+Wolves+Rangers → Content Creator
  { weekId: W[4], familyId: F.Warriors,  challengeId: C.bookSummary },
  { weekId: W[4], familyId: F.Guardians, challengeId: C.bookSummary },
  { weekId: W[4], familyId: F.Hunters,   challengeId: C.bookSummary },
  { weekId: W[4], familyId: F.Snippers,  challengeId: C.contentCreator },
  { weekId: W[4], familyId: F.Wolves,    challengeId: C.contentCreator },
  { weekId: W[4], familyId: F.Rangers,   challengeId: C.contentCreator },

  // week 5: swap — Warriors+Guardians+Hunters → Content Creator | Snippers+Wolves+Rangers → تلخيص الكتاب
  { weekId: W[5], familyId: F.Warriors,  challengeId: C.contentCreator },
  { weekId: W[5], familyId: F.Guardians, challengeId: C.contentCreator },
  { weekId: W[5], familyId: F.Hunters,   challengeId: C.contentCreator },
  { weekId: W[5], familyId: F.Snippers,  challengeId: C.bookSummary },
  { weekId: W[5], familyId: F.Wolves,    challengeId: C.bookSummary },
  { weekId: W[5], familyId: F.Rangers,   challengeId: C.bookSummary },

  // week 6: all → سؤال العقيدة
  ...ALL.map(f => ({ weekId: W[6], familyId: f, challengeId: C.aqeeda })),

  // week 7: all → الفني (سلاح المهندسين)
  ...ALL.map(f => ({ weekId: W[7], familyId: f, challengeId: C.fanni })),

  // week 8: all → Escape Room
  ...ALL.map(f => ({ weekId: W[8], familyId: f, challengeId: C.escapeRoom })),
];

const rows = schedule.map(({ weekId, familyId, challengeId }) => ({
  family_id:    familyId,
  week_id:      weekId,
  challenge_id: challengeId,
}));

const { error } = await db.from('family_week_assignments')
  .upsert(rows, { onConflict: 'family_id,week_id' });

if (error) {
  console.error('Insert failed:', error.message);
} else {
  console.log(`✓ Seeded ${rows.length} assignments`);
}
