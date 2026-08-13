// Seeded once, the first time a member's My Handbook is created (see
// getAtlasWorkspace in atlas.ts) — one worked example per default
// section, all on the same condition (lateral epicondylopathy) so a
// new member can see how a note/protocol/template actually differ in
// practice, not just read empty section labels. Ordinary rows once
// created: a member can edit or delete them like anything else.
//
// Body HTML is restricted to the same inline vocabulary the rich-text
// editor itself produces (span/b/strong/u/i/em/s/ul/ol/li/blockquote/a
// — see rich-text.ts's ALLOWED_TAGS): no <p>/<h1-6>/<div>, since
// sanitizeRichText strips those down to bare text on every render.
// "Headings" here are a bold+large span followed by <br>, exactly what
// clicking Bold + the Large font-size option in the editor toolbar
// would produce on a real selection.

const H = 'font-bold text-lg';
const B = 'font-bold';

export const SAMPLE_PAGE_TITLE = "Lateral Epicondylopathy";
export const SAMPLE_PAGE_BODY =
  `<span class="${H}">Overview</span><br>` +
  `Lateral epicondylopathy ("tennis elbow") is an overuse tendinopathy of the common extensor origin, ` +
  `predominantly involving the <span class="${B}">extensor carpi radialis brevis (ECRB)</span> tendon at the lateral epicondyle. ` +
  `Peak incidence is age 35–54; common in racquet sports and repetitive gripping/wrist-extension work.<br><br>` +
  `<span class="${H}">Presentation</span><br>` +
  `<ul>` +
  `<li>Insidious lateral elbow pain, worse with gripping, lifting with the elbow extended, or repetitive wrist extension</li>` +
  `<li>Pain with activities like shaking hands, turning a doorknob, or a backhand stroke</li>` +
  `<li>No true neurologic symptoms — numbness/tingling should prompt reconsidering the diagnosis</li>` +
  `</ul><br>` +
  `<span class="${H}">Exam Findings</span><br>` +
  `<ul>` +
  `<li>Point tenderness ~1cm distal and anterior to the lateral epicondyle, over the ECRB origin</li>` +
  `<li>Pain reproduced with resisted wrist extension (elbow extended, forearm pronated)</li>` +
  `<li>Positive Cozen's test and positive Mill's test</li>` +
  `<li>Grip strength often reduced and painful on the affected side — worth quantifying with a dynamometer at baseline</li>` +
  `</ul><br>` +
  `<span class="${H}">Working Diagnosis</span><br>` +
  `Clinical diagnosis — imaging (ultrasound or MRI) is reserved for atypical presentations, suspected tear, or failure to progress ` +
  `after a full course of conservative management.<br><br>` +
  `<blockquote>Most cases improve with activity modification and progressive loading within 6–12 months. Set that timeline expectation with the patient early — it's a common source of frustration otherwise.</blockquote>`;

export const SAMPLE_PROTOCOL_TITLE = "Lateral Epicondylopathy Rehab Protocol";
export const SAMPLE_PROTOCOL_BODY =
  `<span class="${H}">Phase 1 — Load Management &amp; Pain Control (Weeks 0–2)</span><br>` +
  `<ul>` +
  `<li>Activity modification: reduce or avoid provocative gripping and repetitive wrist extension</li>` +
  `<li>Isometric wrist extension holds, submaximal effort, several short sessions per day</li>` +
  `<li>Counterforce (forearm) brace during aggravating tasks</li>` +
  `<li>Ice and NSAIDs PRN, per physician guidance</li>` +
  `<li>Address ergonomics — grip size, racquet string tension, tool handle diameter</li>` +
  `</ul><br>` +
  `<span class="${H}">Phase 2 — Progressive Loading (Weeks 2–6)</span><br>` +
  `<ul>` +
  `<li>Eccentric wrist extensor loading (e.g. Tyler Twist or dumbbell eccentric curls), 3 sets of 10–15, slow 4-count lowering</li>` +
  `<li>Progress resistance weekly as tolerated — pain during exercise ≤ 3–4/10 and resolving within 24h is the guide</li>` +
  `<li>Grip strengthening (putty or hand gripper) within a pain-free range</li>` +
  `<li>Forearm extensor soft-tissue work as an adjunct, not a substitute for loading</li>` +
  `</ul><br>` +
  `<span class="${H}">Phase 3 — Return to Sport / Work (Weeks 6–12+)</span><br>` +
  `<ul>` +
  `<li>Task-specific loading that simulates the grip and wrist-extension demands of the target activity</li>` +
  `<li>Graded return to racquet sport or manual work, increasing volume by roughly 10% per week</li>` +
  `<li>Reassess technique (backhand mechanics, tool grip) to reduce recurrence risk</li>` +
  `</ul><br>` +
  `<span class="${B}">Discharge criteria:</span> pain-free resisted wrist extension, grip strength within 90% of the contralateral side, ` +
  `and symptom-free return to full activity sustained for 2 consecutive weeks.<br><br>` +
  `<blockquote>Symptoms persisting beyond 3 months of consistent loading warrant reassessment. Weigh corticosteroid injection carefully — short-term relief can come at the cost of impaired long-term tendon healing — and consider PRP or specialist referral for recalcitrant cases.</blockquote>`;

export const SAMPLE_TEMPLATE_TITLE = "Lateral Epicondylopathy Note Template";
export const SAMPLE_TEMPLATE_BODY =
  `<i>Template — copy this structure and fill in the brackets for your own patient.</i><br><br>` +
  `<span class="${H}">History</span><br>` +
  `<ul>` +
  `<li><span class="${B}">Chief complaint:</span> Lateral [L / R] elbow pain, onset [insert], aggravated by [insert activity]</li>` +
  `<li><span class="${B}">Duration:</span> [insert]</li>` +
  `<li><span class="${B}">Prior treatment:</span> [insert]</li>` +
  `</ul><br>` +
  `<span class="${H}">Exam</span><br>` +
  `<ul>` +
  `<li><span class="${B}">Palpation:</span> Point tenderness at [insert location]</li>` +
  `<li><span class="${B}">Special tests:</span> Cozen's [+ / –], Mill's [+ / –], resisted wrist extension [+ / –]</li>` +
  `<li><span class="${B}">Grip strength (affected / unaffected):</span> [insert] / [insert]</li>` +
  `</ul><br>` +
  `<span class="${H}">Assessment</span><br>` +
  `<ul>` +
  `<li><span class="${B}">Working diagnosis:</span> Lateral epicondylopathy (ECRB tendinopathy)</li>` +
  `<li><span class="${B}">Severity / stage:</span> [insert]</li>` +
  `</ul><br>` +
  `<span class="${H}">Plan</span><br>` +
  `<ul>` +
  `<li><span class="${B}">Activity modification:</span> [insert]</li>` +
  `<li><span class="${B}">Rehab protocol:</span> [insert — see the Lateral Epicondylopathy Rehab Protocol in My Protocols]</li>` +
  `<li><span class="${B}">Follow-up:</span> [insert]</li>` +
  `</ul>`;
