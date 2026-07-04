// Client-side library tests — pure Node, no browser or build step. Mirrors the
// server suite's style (server/test/run.mjs). Run with: npm test
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) { passed++; console.log('  ✓', msg); } else { failed++; console.log('  ✗', msg); } };

// Minimal browser shims for libs that touch storage. indexedDB is deliberately
// left undefined — the archive path must degrade gracefully without it.
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const { checkinDue, recordCheckin, CHECKIN_MOODS } = await import('../src/lib/checkin.js');
const { pomoNext } = await import('../src/lib/cowork.js');
const { recallBlock } = await import('../src/lib/recall.js');
const { seasonalTheme, seasonalDue, seasonalLine, seasonalParticles } = await import('../src/lib/seasonal.js');
const { dailyGuidance, weeklyOutlook, companionOfDay } = await import('../src/lib/horoscope.js');
const { addGoal, newGoal, toggleGoal, goalToNudge, markNudged } = await import('../src/lib/goals.js');
const { saveSession, loadSession, ARCHIVE_THRESHOLD, KEEP_RECENT } = await import('../src/lib/storage.js');
const { buildSystemBlocks } = await import('../src/lib/prompt.js');
const { pickReminder, reminderKey, whenPhrase } = await import('../src/lib/reminders.js');
const habits = await import('../src/lib/habits.js');

console.log('checkin');
{
  const day = (offset) => Date.UTC(2026, 5, 15 + offset, 12); // June 15 + n, noon UTC
  let ci = recordCheckin(undefined, 'good', '', day(0));
  ok(ci.streak === 1 && ci.history.length === 1, 'first check-in starts a 1-day streak');
  ci = recordCheckin(ci, 'great', 'note!', day(1));
  ok(ci.streak === 2 && ci.history[0].note === 'note!', 'next-day check-in increments streak and stores the note');
  const updated = recordCheckin(ci, 'low', '', day(1));
  ok(updated.streak === 2 && updated.history.length === 2 && updated.history[0].mood === 'low', 'same-day re-check updates mood without inflating streak');
  const gapped = recordCheckin(ci, 'okay', '', day(5));
  ok(gapped.streak === 1, 'a gap resets the streak to 1');
  ok(checkinDue(gapped) === (new Date().toISOString().slice(0, 10) !== gapped.last), 'checkinDue compares against today');
  ok(CHECKIN_MOODS.length === 5, 'five mood options');
}

console.log('cowork pomodoro');
{
  let s = { seg: 'focus', round: 1 };
  const seq = [];
  for (let i = 0; i < 4; i++) { s = pomoNext(s.seg, s.round, 25, 5); seq.push(`${s.seg}${s.round}:${s.secs}`); }
  ok(seq.join(' ') === 'break1:300 focus2:1500 break2:300 focus3:1500', 'focus/break alternation with round tracking');
  ok(pomoNext('focus', 1, 50, 10).secs === 600, '50/10 preset break length');
}

console.log('recall');
{
  const older = [
    { role: 'user', content: 'my sister Maya is visiting from Portland next month', ts: 1 },
    { role: 'assistant', content: 'that sounds lovely', ts: 2 },
    { role: 'user', content: 'I love making pasta on sundays', ts: 3 },
  ];
  const block = recallBlock(older, 'when is my sister Maya arriving from Portland?', 'Sam');
  ok(!!block && block.includes('Maya'), 'keyword overlap recalls the on-topic older message');
  ok(!recallBlock(older, 'zzz qqq xxx', 'Sam'), 'no recall block for unrelated queries');
}

console.log('seasonal');
{
  const t = (d) => seasonalTheme(Date.parse(d + 'T12:00:00Z'));
  ok(t('2026-12-25').holiday === 'Christmas', 'Christmas overrides the season');
  ok(t('2026-01-15').key === 'sea-winter-2026', 'plain winter day keys by season+year');
  ok(seasonalDue('', Date.parse('2026-06-30T12:00:00Z')) === true, 'unseen occasion is due');
  ok(seasonalDue(t('2026-06-30').key, Date.parse('2026-06-30T12:00:00Z')) === false, 'seen occasion is not due');
  ok(seasonalLine(t('2026-10-31')).toLowerCase().includes('halloween'), 'holiday line mentions the holiday');
  ok(seasonalParticles(t('2026-01-15')).length === 14, 'deterministic particle count');
}

console.log('horoscope');
{
  const ts = Date.parse('2026-07-02T12:00:00Z');
  const a = dailyGuidance('leo', ts), b = dailyGuidance('leo', ts);
  ok(JSON.stringify(a) === JSON.stringify(b), 'same sign + same day is deterministic');
  ok(dailyGuidance('leo', ts).line !== dailyGuidance('leo', ts + 86400000).line || dailyGuidance('leo', ts).focus !== dailyGuidance('leo', ts + 86400000).focus || dailyGuidance('leo', ts).rating !== dailyGuidance('leo', ts + 86400000).rating, 'consecutive days differ somewhere');
  ok(weeklyOutlook('leo', ts).length === 7, '7-day outlook');
  const comps = [{ id: 'a', name: 'A', status: 'awake' }, { id: 'b', name: 'B', status: 'awake' }];
  const c1 = companionOfDay(comps, 'leo', ts).comp.id;
  const c2 = companionOfDay(comps, 'leo', ts + 86400000).comp.id;
  ok(c1 !== c2, 'companion of the day rotates daily with 2 companions');
  ok(companionOfDay([], 'leo', ts) === null, 'no companions -> null');
}

console.log('goals');
{
  let goals = addGoal([], newGoal('Sleep more'));
  ok(goals.length === 1 && !goals[0].done, 'add goal');
  goals = toggleGoal(goals, goals[0].id);
  ok(goals[0].done === true, 'toggle completes the goal');
  goals = toggleGoal(goals, goals[0].id);
  const nudge = goalToNudge(goals, Date.now());
  // freshly-created goals aren't nudged immediately (gated by time) — both
  // outcomes are valid depending on the gate; just ensure no crash and markNudged works.
  const marked = markNudged(goals, goals[0].id);
  ok(Array.isArray(marked) && marked[0].id === goals[0].id, 'markNudged returns the list');
  ok(nudge === null || nudge.id === goals[0].id, 'goalToNudge returns null or the goal');
}

console.log('storage archive trim');
{
  const msgs = Array.from({ length: ARCHIVE_THRESHOLD + 100 }, (_, i) => ({ role: 'user', content: 'm' + i, ts: i }));
  const r = saveSession({ profile: { name: 'T' }, companions: [], messages: msgs });
  ok(r.ok, 'save succeeds without indexedDB (archive is best-effort)');
  const loaded = loadSession();
  ok(loaded.messages.length === KEEP_RECENT, `blob keeps only the ${KEEP_RECENT} most recent messages`);
  ok(loaded.messages[loaded.messages.length - 1].content === 'm' + (ARCHIVE_THRESHOLD + 99), 'newest message survives the trim');
  const small = saveSession({ profile: { name: 'T' }, companions: [], messages: msgs.slice(0, 10) });
  ok(small.ok && loadSession().messages.length === 10, 'short histories are stored untouched');
}

console.log('calendar prompt block');
{
  const comp = { id: 'c1', name: 'Coral', pronouns: 'they/them', zodiac: 'pisces', personality: 'warm', quirk: 'x', color: { name: 'x' }, colorName: 'x', status: 'awake', apparentAge: 'peer' };
  const base = { name: 'Sam', ageGroup: 'adult' };
  const withCal = buildSystemBlocks(comp, { ...base, upcoming: [{ label: 'Tue Jul 7, 3:00 PM', title: 'Dentist' }] }, [comp], 'c1', []);
  ok(withCal.volatile.includes("SAM'S UPCOMING CALENDAR".replace('SAM', 'Sam')) && withCal.volatile.includes('Dentist'), 'shared events appear in the volatile prompt block');
  ok(withCal.volatile.includes('Never recite the list'), 'companions are told not to recite the calendar');
  const noCal = buildSystemBlocks(comp, base, [comp], 'c1', []);
  ok(!noCal.volatile.includes('UPCOMING CALENDAR'), 'no calendar block when nothing is shared');
  const empty = buildSystemBlocks(comp, { ...base, upcoming: [] }, [comp], 'c1', []);
  ok(!empty.volatile.includes('UPCOMING CALENDAR'), 'empty upcoming list adds nothing');
}

console.log('profile memory prompt block');
{
  const comp = { id: 'c1', name: 'Coral', pronouns: 'they/them', zodiac: 'pisces', personality: 'warm', quirk: 'x', color: { name: 'x' }, colorName: 'x', status: 'awake', apparentAge: 'peer' };
  const profile = { name: 'Sam', ageGroup: 'adult', vibe: 'calm', communication: 'direct', loveLang: 'words', needs: ['encouragement', 'fun'], activities: ['gaming', 'music'] };
  const { stable } = buildSystemBlocks(comp, profile, [comp], 'c1', []);
  ok(stable.includes('Calm & grounded'), 'vibe slug is humanized to its label');
  ok(stable.includes('Words of affirmation'), 'love-language slug is humanized');
  ok(stable.includes('Someone who cheers me on') && stable.includes('More laughter & fun'), 'multi-select need slugs are humanized');
  ok(stable.includes('Gaming') && stable.includes('Music'), 'activity slugs are humanized');
  ok(!/Energy: calm\b/.test(stable) && !/Love language: words\b/.test(stable), 'raw slugs no longer leak into the prompt');
  ok(stable.includes('already KNOW') && /never re-ask/i.test(stable), 'companions are told they already know the profile and not to re-ask it');
}

console.log('calendar reminders');
{
  const now = 1_700_000_000_000;
  const soon = { title: 'Dentist', when: now + 40 * 60000, allDay: false };
  const later = { title: 'Dinner', when: now + 5 * 3600000, allDay: false };
  const far = { title: 'Trip', when: now + 3 * 86400000, allDay: false };
  const past = { title: 'Old', when: now - 60000, allDay: false };
  const allDayToday = { title: 'Holiday', when: now + 6 * 3600000, allDay: true };

  const r = pickReminder([later, soon, far], now, {});
  ok(r && r.event.title === 'Dentist' && r.urgency === 'soon', 'imminent event is picked with "soon" urgency');
  ok(pickReminder([far], now, {}) === null, 'events days out are not reminded yet');
  ok(pickReminder([past], now, {}) === null, 'past events are never reminded');

  const later2 = pickReminder([later], now, {});
  ok(later2 && later2.urgency === 'today', 'a later-today event is a gentle "today" heads-up');
  ok(pickReminder([allDayToday], now, {}).urgency === 'today', 'all-day event today is a "today" nudge');

  const key = reminderKey(soon);
  ok(pickReminder([soon], now, { [key]: now }) === null, 'an already-reminded event is skipped');
  ok(reminderKey({ title: 'A B!', when: now }) === reminderKey({ title: 'a b', when: now }), 'reminder keys are slug/time-stable');

  ok(/minute/.test(whenPhrase(soon, now)), 'whenPhrase describes a soon event in minutes');
  const noon = Date.UTC(2023, 10, 14, 12, 0, 0);
  ok(whenPhrase({ when: noon + 2 * 3600000, allDay: true }, noon) === 'today', 'whenPhrase calls a same-day all-day event "today"');
  ok(whenPhrase({ when: noon + 20 * 3600000, allDay: true }, noon) === 'tomorrow', 'whenPhrase calls a next-day all-day event "tomorrow"');
}

console.log('habits');
{
  const DAY = 86400000;
  const now = Date.UTC(2023, 5, 14, 9, 0, 0); // Wed 2023-06-14

  // add + schedule
  let hs = habits.addHabit([], 'Meditate', { em: '🧘', when: 'morning', time: '07:30' });
  ok(hs[0].when === 'morning' && hs[0].time === '07:30', 'addHabit stores time-of-day + specific time');
  ok(habits.scheduleLabel(hs[0]) === '⏰ 7:30 AM', 'scheduleLabel shows a specific time in 12h');
  ok(habits.scheduleLabel(habits.addHabit([], 'Water', { when: 'anytime' })[0]) === '✦ Anytime', 'scheduleLabel falls back to the slot label');
  ok(habits.addHabit([], '   ').length === 0, 'blank habit is ignored');
  ok(habits.HABIT_IDEAS.length === 20, 'ships exactly 20 preset habits');
  hs = habits.addHabit(hs, 'Read', { when: 'evening' });
  ok(hs[0].text === 'Meditate' && hs[1].text === 'Read', 'habits sort earliest-in-the-day first');

  // duration ("time allowed") — e.g. journal 40 min at 8pm every Wed
  const jd = habits.addHabit([], 'Journal', { time: '20:00', freq: { type: 'weekdays', days: [3] }, duration: 40 })[0];
  ok(jd.duration === 40 && jd.time === '20:00' && jd.freq.days[0] === 3, 'addHabit stores duration + time + weekday');
  ok(habits.formatDuration(40) === '40 min' && habits.formatDuration(60) === '1 hr' && habits.formatDuration(90) === '1 hr 30 min' && habits.formatDuration(0) === '', 'formatDuration formats minutes/hours');

  // daily completion + streak (completion-log model; streak is computed, not stored)
  const id = hs[0].id;
  let d = habits.toggleToday(hs, id, now);
  let h = d.find((x) => x.id === id);
  ok(habits.doneToday(h, now) && habits.streakOf(h, now) === 1, 'toggle marks done, streak = 1');
  d = habits.toggleToday(d, id, now);
  ok(!habits.doneToday(d.find((x) => x.id === id), now), 'toggling again undoes today');
  d = habits.toggleToday(habits.toggleToday(hs, id, now - DAY), id, now);
  ok(habits.streakOf(d.find((x) => x.id === id), now) === 2, 'consecutive days build the streak');

  // recurrence labels
  ok(habits.freqLabel({ freq: { type: 'weekdays', days: [1, 3, 5] } }) === 'Mon · Wed · Fri', 'freqLabel lists chosen weekdays');
  ok(habits.freqLabel({ freq: { type: 'timesPerWeek', n: 2 } }) === '2× a week', 'freqLabel for N-times-a-week');
  ok(habits.freqLabel({ freq: { type: 'monthly' } }) === 'Monthly', 'freqLabel for monthly');

  // weekdays: due only on scheduled days (now is a Wednesday)
  const wd = habits.addHabit([], 'Gym', { freq: { type: 'weekdays', days: [1, 3, 5] } })[0];
  ok(habits.dueToday(wd, now) === true, 'weekday habit is due on a scheduled day (Wed)');
  ok(habits.dueToday(wd, Date.UTC(2023, 5, 13, 9)) === false, 'weekday habit is not due on an off day (Tue)');

  // N×/week: due until the weekly target is met, then a 1-week streak
  let tp = habits.addHabit([], 'Run', { freq: { type: 'timesPerWeek', n: 2 } });
  const tid = tp[0].id;
  ok(habits.dueToday(tp[0], now) === true, 'N×/week habit is due before the target');
  tp = habits.toggleToday(habits.toggleToday(tp, tid, now - DAY), tid, now); // Tue + Wed same week
  const th = tp.find((x) => x.id === tid);
  ok(habits.weekProgress(th, now) === 2, 'weekProgress counts completions this week');
  ok(habits.dueToday(th, now) === false && habits.streakOf(th, now) === 1, 'target met = not due + 1-week streak');

  // weekly streak across two consecutive weeks
  let wk = habits.addHabit([], 'Deep clean', { freq: { type: 'weekly' } });
  const wid = wk[0].id;
  wk = habits.toggleToday(habits.toggleToday(wk, wid, now - 7 * DAY), wid, now);
  ok(habits.streakOf(wk.find((x) => x.id === wid), now) === 2, 'weekly streak counts consecutive weeks');

  // opt-in companion reminders
  let rl = habits.addHabit([], 'Meditate', { time: '00:00' }); // time already passed
  const rid = rl[0].id;
  ok(rl[0].remind === false && habits.habitToRemind(rl, now) === null, 'no reminder while the toggle is off');
  rl = habits.toggleRemind(rl, rid);
  ok(rl[0].remind === true, 'toggleRemind turns the reminder on');
  const picked = habits.habitToRemind(rl, now);
  ok(picked && picked.id === rid, 'a reminded, due, past-its-time habit is picked to nudge');
  habits.markHabitReminded(habits.remindKey(picked, now), now);
  ok(habits.habitToRemind(rl, now) === null, 'the same habit is not nudged twice in a day');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
