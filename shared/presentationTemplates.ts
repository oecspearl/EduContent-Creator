/**
 * Gagné's Events of Instruction — Presentation Templates
 *
 * Five subject-specific templates that produce exactly 9 slides,
 * one per Gagné event. Used by both client (template picker) and
 * server (AI prompt construction).
 */

export type TemplateId =
  | 'wonder-world'
  | 'story-builders'
  | 'number-ninjas'
  | 'heart-heritage'
  | 'spark-lab'
  | 'default';

export type GagneEvent = {
  eventNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  eventLabel: string;
  slideType: string;
  slideTitle: string;
  teacherTip: string;
  aiDirective: string;
};

export type ColorTheme = 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'red';

export type PresentationTemplate = {
  id: TemplateId;
  name: string;
  tagline: string;
  subject: string;
  gradeBand: string;
  colorTheme: ColorTheme;
  primaryHex: string;
  accentHex: string;
  slideCount: 9;
  events: GagneEvent[];
  systemPromptPrefix: string;
};

// Shared Gagné event labels
const GAGNE_LABELS: Record<number, string> = {
  1: 'Gain Attention',
  2: 'Share Objectives',
  3: 'Prior Knowledge',
  4: 'New Learning',
  5: 'Guided Practice',
  6: 'Try It Yourself',
  7: 'Feedback',
  8: 'Check Learning',
  9: 'Remember & Use',
};

// ── TEMPLATE 1 — Wonder World (Science / Nature, K–2) ───────────────────────

const wonderWorld: PresentationTemplate = {
  id: 'wonder-world',
  name: 'Wonder World',
  tagline: 'Science & Nature',
  subject: 'Science',
  gradeBand: 'K–2',
  colorTheme: 'green',
  primaryHex: '#2D7D46',
  accentHex: '#F5C842',
  slideCount: 9,
  systemPromptPrefix: `You are designing an elementary science presentation for grades K–2.
Use simple, concrete language appropriate for 5–8 year-olds.
Every slide must include at least one vivid, nature-based example or analogy.
Vocabulary must be kept to 3 words or fewer per slide.
Favour active verbs: observe, explore, compare, describe.
Where bullet points are generated, keep each point to one short sentence.
The tone should be warm, curious, and encouraging — like a nature walk guide.`,
  events: [
    {
      eventNumber: 1, eventLabel: GAGNE_LABELS[1], slideType: 'title',
      slideTitle: "Let's Explore! \u{1F33F}",
      teacherTip: 'Open with a surprising image, a live specimen, or a "Did You Know?" fact. Give students 30 seconds to turn and share their first reaction.',
      aiDirective: 'Generate a hook: a short surprising fact or intriguing question about the topic. Suitable for 5–8 year-olds. One sentence maximum.',
    },
    {
      eventNumber: 2, eventLabel: GAGNE_LABELS[2], slideType: 'content',
      slideTitle: 'What We Will Learn Today',
      teacherTip: 'Read objectives aloud together. Ask: "What do you already know about this?" Record responses on a sticky-note wall.',
      aiDirective: 'Generate 3 learning objectives as "I can…" statements. Use simple vocabulary a 5-year-old would understand. Each objective should be one sentence.',
    },
    {
      eventNumber: 3, eventLabel: GAGNE_LABELS[3], slideType: 'guiding-questions',
      slideTitle: 'What Do You Already Know?',
      teacherTip: 'Use Think–Pair–Share. Give 60 seconds of quiet thinking, then partner talk, then 2–3 whole-class shares. Record key ideas on the board.',
      aiDirective: 'Generate a Think–Pair–Share prompt: one open question activating prior knowledge about the topic. Suitable for young learners.',
    },
    {
      eventNumber: 4, eventLabel: GAGNE_LABELS[4], slideType: 'content',
      slideTitle: "Let's Explore!",
      teacherTip: 'Present one key concept only. Use a photograph or diagram. Think aloud as you point to features. Introduce exactly 3 vocabulary words.',
      aiDirective: 'Present the core concept in 2–3 short sentences. Include 3 key vocabulary words with child-friendly definitions. Suggest one image that would illustrate the concept.',
    },
    {
      eventNumber: 5, eventLabel: GAGNE_LABELS[5], slideType: 'activity',
      slideTitle: "Let's Try Together! \u{1F331}",
      teacherTip: 'Use I Do → We Do → You Do. Model first (think aloud), then invite the class to participate step by step. Provide sentence starters on the board.',
      aiDirective: 'Describe a 3-step guided activity (I Do / We Do / You Do) teachers and students do together to practise the concept. Keep each step to one sentence.',
    },
    {
      eventNumber: 6, eventLabel: GAGNE_LABELS[6], slideType: 'activity',
      slideTitle: 'Your Turn! \u{2B50}',
      teacherTip: 'Students work independently or in pairs. Provide a scaffold option (sentence frames, diagram to label) and an extension option for early finishers.',
      aiDirective: 'Design a short independent task (2–4 steps) students can complete to demonstrate understanding. Include one scaffolding option and one extension option.',
    },
    {
      eventNumber: 7, eventLabel: GAGNE_LABELS[7], slideType: 'reflection',
      slideTitle: "Let's See How We Did! \u{1F44F}",
      teacherTip: 'Celebrate specific successes by name. Address the most common error without singling out students. Give one concrete improvement tip.',
      aiDirective: 'Generate three feedback prompts: What went well, one common mistake to address, and one tip to improve. Frame positively for young learners.',
    },
    {
      eventNumber: 8, eventLabel: GAGNE_LABELS[8], slideType: 'guiding-questions',
      slideTitle: 'Quick Check \u{2705}',
      teacherTip: 'Use an exit ticket: 3 levelled questions (recall → understand → apply). Collect slips and sort into three piles to guide next lesson planning.',
      aiDirective: 'Generate 3 exit-ticket questions at increasing complexity: one recall, one explanation ("Why…?"), one application ("What would happen if…?"). Suitable for grades K–2.',
    },
    {
      eventNumber: 9, eventLabel: GAGNE_LABELS[9], slideType: 'closing',
      slideTitle: 'Remember It & Use It! \u{1F30D}',
      teacherTip: 'Connect today\'s learning to students\' lives, the local environment, or a future lesson. End with an action: "Look for this tonight at home."',
      aiDirective: 'Write a real-world connection statement linking the topic to students\' daily lives or community. Then write a one-sentence bridge to the next lesson.',
    },
  ],
};

// ── TEMPLATE 2 — Story Builders (ELA, Grades 1–3) ───────────────────────────

const storyBuilders: PresentationTemplate = {
  id: 'story-builders',
  name: 'Story Builders',
  tagline: 'Language Arts & Literacy',
  subject: 'Language Arts',
  gradeBand: '1–3',
  colorTheme: 'teal',
  primaryHex: '#0D7A7A',
  accentHex: '#E8614A',
  slideCount: 9,
  systemPromptPrefix: `You are designing an elementary Language Arts presentation for grades 1–3.
All content must be literacy-focused: reading comprehension, writing skills,
grammar, or oral language as appropriate to the topic.
Generate sentence frames wherever possible to support ELL learners.
Vocabulary instruction should follow the Frayer Model structure (definition,
example, non-example, illustration cue) where relevant.
The tone should be warm, narrative, and story-centred.`,
  events: [
    {
      eventNumber: 1, eventLabel: GAGNE_LABELS[1], slideType: 'title',
      slideTitle: 'Welcome, Story Builders! \u{1F4DA}',
      teacherTip: 'Show the book cover or a dramatic illustration. Read the first line of the text aloud. Ask: "What do you think this story will be about?"',
      aiDirective: 'Generate a book-talk hook: one evocative sentence about the text or topic that creates intrigue. Suitable for ages 6–9.',
    },
    {
      eventNumber: 2, eventLabel: GAGNE_LABELS[2], slideType: 'content',
      slideTitle: "Today's Reading & Writing Goals",
      teacherTip: 'Present three objectives: one reading, one writing, one speaking/listening. Display them for the full lesson. Return to them at close.',
      aiDirective: 'Generate 3 "I can…" objectives: one reading, one writing, one speaking/listening. Use student-friendly language for grades 1–3.',
    },
    {
      eventNumber: 3, eventLabel: GAGNE_LABELS[3], slideType: 'guiding-questions',
      slideTitle: 'What Do You Already Know? \u{1F5FA}\u{FE0F}',
      teacherTip: 'Use a KWL chart. Fill in K (Know) and W (Want to know) now. Return to L (Learned) at the close of the lesson.',
      aiDirective: 'Generate a KWL-chart prompt: 2 questions for the K column and 2 questions for the W column related to the literacy topic.',
    },
    {
      eventNumber: 4, eventLabel: GAGNE_LABELS[4], slideType: 'vocabulary',
      slideTitle: 'Reading & Discovery',
      teacherTip: 'Introduce the text. Do a picture walk first. Then read aloud (or shared reading). Pause at key vocabulary. Point to illustrations as you read.',
      aiDirective: 'Provide a brief "book talk" (2 sentences) and 3 key vocabulary words with child-friendly definitions relevant to the literacy topic.',
    },
    {
      eventNumber: 5, eventLabel: GAGNE_LABELS[5], slideType: 'activity',
      slideTitle: 'We Read & Write Together \u{270D}\u{FE0F}',
      teacherTip: 'Model the skill (think aloud), then shared practice (class participates), then guided groups. Use a visible sentence frame throughout.',
      aiDirective: 'Design a 3-stage guided literacy activity: Teacher Models → Shared Practice → Guided Groups. Include one sentence frame for student use.',
    },
    {
      eventNumber: 6, eventLabel: GAGNE_LABELS[6], slideType: 'activity',
      slideTitle: 'Your Writing Time \u{270D}\u{FE0F}',
      teacherTip: 'Post the writing prompt and the writer\'s checklist. Circulate and conference with 3–4 students. Collect work to inform tomorrow\'s lesson.',
      aiDirective: 'Generate a writing prompt connected to the topic, a 4-item writer\'s checklist, and 3 sentence starters or useful connective phrases.',
    },
    {
      eventNumber: 7, eventLabel: GAGNE_LABELS[7], slideType: 'reflection',
      slideTitle: 'How Did We Do? \u{1F44F}',
      teacherTip: 'Share 2 anonymous student samples (strong and developing). Guide class to name strengths and one next step. Use "warm/cool" feedback language.',
      aiDirective: 'Generate specific literacy feedback prompts: what strong responses include, one common error to address, one revision strategy. Grade 1–3 appropriate.',
    },
    {
      eventNumber: 8, eventLabel: GAGNE_LABELS[8], slideType: 'guiding-questions',
      slideTitle: 'Quick Check \u{2705}',
      teacherTip: 'Exit slip: 3 questions — recall a fact, explain in own words, apply the skill. Use these to form next-day guided reading groups.',
      aiDirective: 'Generate 3 exit-slip questions for literacy: one comprehension recall, one "explain in your own words", one written application of the skill.',
    },
    {
      eventNumber: 9, eventLabel: GAGNE_LABELS[9], slideType: 'closing',
      slideTitle: 'Take It Further! \u{1F680}',
      teacherTip: 'Complete the L column of the KWL chart. Suggest a home reading connection. Preview the next lesson to build anticipation.',
      aiDirective: 'Write a real-world literacy connection (where students might use this reading/writing skill in life) and a one-sentence preview of the next lesson.',
    },
  ],
};

// ── TEMPLATE 3 — Number Ninjas (Mathematics, Grades 3–6) ─────────────────────

const numberNinjas: PresentationTemplate = {
  id: 'number-ninjas',
  name: 'Number Ninjas',
  tagline: 'Mathematics',
  subject: 'Mathematics',
  gradeBand: '3–6',
  colorTheme: 'blue',
  primaryHex: '#14213D',
  accentHex: '#E76F0A',
  slideCount: 9,
  systemPromptPrefix: `You are designing an elementary Mathematics presentation for grades 3–6.
Every slide should foreground mathematical reasoning, not just computation.
Include at least one worked example with clearly labelled steps.
Where possible, present problems in real-world Caribbean contexts
(markets, cricket, sea distance, rainfall, cooking) to increase relevance.
Vocabulary should be mathematically precise but explained in plain language.
Scaffolding strategies include number lines, area models, and place-value charts.`,
  events: [
    {
      eventNumber: 1, eventLabel: GAGNE_LABELS[1], slideType: 'title',
      slideTitle: 'Number Ninjas: Mission Briefing \u{26A1}',
      teacherTip: 'Open with a real-world problem or a surprising number pattern. Give students 60 seconds to estimate or respond before beginning instruction.',
      aiDirective: 'Generate a number hook: a surprising real-world problem or intriguing number pattern related to the topic. One sentence, suitable for grades 3–6.',
    },
    {
      eventNumber: 2, eventLabel: GAGNE_LABELS[2], slideType: 'content',
      slideTitle: 'Mission Objectives \u{1F3AF}',
      teacherTip: 'State objectives as "understand", "solve", and "connect" goals. Display success criteria so students know what mastery looks like.',
      aiDirective: 'Generate 3 maths objectives: one conceptual understanding, one procedural skill, one real-world application. Include one success criterion.',
    },
    {
      eventNumber: 3, eventLabel: GAGNE_LABELS[3], slideType: 'guiding-questions',
      slideTitle: 'Warm-Up: Activate Your Brain! \u{1F9E0}',
      teacherTip: 'Pose a number talk question. Accept multiple strategies. Record different approaches on the board. Explicitly name the strategy type.',
      aiDirective: 'Generate a number-talk warm-up problem that reviews a prerequisite concept. Include 2 discussion prompts to surface different solution strategies.',
    },
    {
      eventNumber: 4, eventLabel: GAGNE_LABELS[4], slideType: 'content',
      slideTitle: 'Discover the Concept \u{1F4D0}',
      teacherTip: 'Show a fully worked example with every step labelled. Think aloud for each step. Use a visual model (area model, number line, table).',
      aiDirective: 'Present the core concept with a fully worked example (3–5 labelled steps). Include one visual model suggestion and 3 key maths vocabulary terms with definitions.',
    },
    {
      eventNumber: 5, eventLabel: GAGNE_LABELS[5], slideType: 'activity',
      slideTitle: "Let's Solve Together \u{1F9EE}",
      teacherTip: 'Work 2–3 practice problems as a class. Use cold-call or mini-whiteboards. Correct misconceptions immediately with guided questioning, not correction.',
      aiDirective: 'Generate 2 guided practice problems (with full solution steps) that the teacher and class solve together. Increasing difficulty from first to second.',
    },
    {
      eventNumber: 6, eventLabel: GAGNE_LABELS[6], slideType: 'activity',
      slideTitle: 'Your Turn! \u{26A1}',
      teacherTip: 'Provide 3–5 problems at increasing difficulty. Offer a hint strip for students who need scaffolding. Use think-pair-share for checking answers.',
      aiDirective: 'Generate 3 independent practice problems at increasing complexity. Include one hint or scaffold for the hardest problem.',
    },
    {
      eventNumber: 7, eventLabel: GAGNE_LABELS[7], slideType: 'reflection',
      slideTitle: 'Check Our Thinking \u{1F50D}',
      teacherTip: 'Go through solutions. Highlight efficient strategies. If more than 30% of the class has a common error, reteach that step before moving on.',
      aiDirective: 'Generate a worked solution for the most conceptually demanding practice problem. Identify the most likely student error and explain how to address it.',
    },
    {
      eventNumber: 8, eventLabel: GAGNE_LABELS[8], slideType: 'guiding-questions',
      slideTitle: 'Exit Ticket \u{2705}',
      teacherTip: 'Three questions: 1 recall, 1 procedural, 1 word problem. Collect and sort into "got it / nearly / needs reteach" piles. Use tomorrow.',
      aiDirective: 'Generate a 3-question maths exit ticket: one recall question, one procedural problem, one word problem. All three related to today\'s topic.',
    },
    {
      eventNumber: 9, eventLabel: GAGNE_LABELS[9], slideType: 'closing',
      slideTitle: 'Real-World Connection \u{1F30D}',
      teacherTip: 'Ask: "Where would you use this in real life?" Pose a take-home challenge problem. Preview the next lesson to connect the mathematical storyline.',
      aiDirective: 'Write a real-world connection showing where this maths skill appears in daily life (use Caribbean contexts where possible). Add a take-home challenge problem.',
    },
  ],
};

// ── TEMPLATE 4 — Heart & Heritage (Social Studies / Values, K–4) ─────────────

const heartHeritage: PresentationTemplate = {
  id: 'heart-heritage',
  name: 'Heart & Heritage',
  tagline: 'Social Studies & Values',
  subject: 'Social Studies',
  gradeBand: 'K–4',
  colorTheme: 'orange',
  primaryHex: '#B85042',
  accentHex: '#4A7C59',
  slideCount: 9,
  systemPromptPrefix: `You are designing an elementary Social Studies or Values Education presentation
for grades K–4. All content must be culturally grounded in the Caribbean
OECS context: communities, national symbols, civic values, and Caribbean
history where relevant. Integrate discussion, role-play, and community
connection activities. Emphasise empathy, respect, and belonging.
Language should be accessible to ages 5–10, with warmth and inclusivity.`,
  events: [
    {
      eventNumber: 1, eventLabel: GAGNE_LABELS[1], slideType: 'title',
      slideTitle: 'Our Community, Our World \u{1F33A}',
      teacherTip: 'Show a photograph of a local community scene, national symbol, or cultural artefact. Ask: "What do you see? What does this mean to you?"',
      aiDirective: 'Generate an attention-hook using a culturally relevant scenario or object from Caribbean community life. One evocative sentence suitable for K–4.',
    },
    {
      eventNumber: 2, eventLabel: GAGNE_LABELS[2], slideType: 'content',
      slideTitle: 'What We Will Learn Today \u{1F393}',
      teacherTip: 'Frame objectives as Know/Understand/Respect to signal that values are part of the learning. Return to these at end of lesson.',
      aiDirective: 'Generate 3 objectives framed as Know, Understand, and Respect/Value. Use community and values language appropriate for grades K–4.',
    },
    {
      eventNumber: 3, eventLabel: GAGNE_LABELS[3], slideType: 'guiding-questions',
      slideTitle: 'What Do You Know? \u{1F5FA}\u{FE0F}',
      teacherTip: 'Use a KWL chart or a photograph-based discussion. Accept all contributions — misconceptions are learning opportunities, not problems to eliminate.',
      aiDirective: 'Generate a KWL-style activation: 2 questions for K and 2 for W, centred on students\' prior experience with the social studies topic.',
    },
    {
      eventNumber: 4, eventLabel: GAGNE_LABELS[4], slideType: 'content',
      slideTitle: 'Explore & Discover \u{1F30D}',
      teacherTip: 'Use images, maps, artefacts, or a short story. Keep direct instruction under 8 minutes. Use think-alouds as you interpret visual sources.',
      aiDirective: 'Present the core social studies content in 3–4 short sentences. Suggest one image (map, photograph, or artefact) that would illustrate the topic. Include 2 key vocabulary terms.',
    },
    {
      eventNumber: 5, eventLabel: GAGNE_LABELS[5], slideType: 'activity',
      slideTitle: 'We Learn Together \u{1F91D}',
      teacherTip: 'Use role-play, sorting, or shared reading. Guide discussion with open questions: "Why do you think…?" "How would you feel if…?" Record responses.',
      aiDirective: 'Design a guided group activity (role-play, sorting, or discussion) where teacher and students explore the social studies concept together. 3 steps maximum.',
    },
    {
      eventNumber: 6, eventLabel: GAGNE_LABELS[6], slideType: 'activity',
      slideTitle: 'Your Turn to Show! \u{2B50}',
      teacherTip: 'Students choose a mode: draw a poster, write a journal entry, create a map, or conduct a mini-interview. Provide a simple rubric or checklist.',
      aiDirective: 'Generate a student task with 3 differentiated options (visual, written, oral) that demonstrate understanding of the social studies topic.',
    },
    {
      eventNumber: 7, eventLabel: GAGNE_LABELS[7], slideType: 'reflection',
      slideTitle: 'How Did We Do? \u{1F44F}',
      teacherTip: 'Share anonymised responses. Celebrate diverse perspectives — in Social Studies, there are often multiple valid views. Use warm/cool feedback.',
      aiDirective: 'Generate feedback prompts that celebrate correct understanding, address a common misconception, and validate multiple perspectives on the social topic.',
    },
    {
      eventNumber: 8, eventLabel: GAGNE_LABELS[8], slideType: 'guiding-questions',
      slideTitle: 'Exit Reflection \u{1FA9E}',
      teacherTip: 'Use a 3-2-1 reflection: 3 things learned, 2 things that surprised me, 1 question I still have. Or use journal sentence starters.',
      aiDirective: 'Generate a 3-2-1 exit reflection (3 facts, 2 surprises, 1 question) tailored to the social studies topic.',
    },
    {
      eventNumber: 9, eventLabel: GAGNE_LABELS[9], slideType: 'closing',
      slideTitle: 'Take It Home! \u{1F3E0}',
      teacherTip: 'Give a community-connection challenge: "Tell someone at home what you learned. Find an example of this in your neighbourhood." Preview next lesson.',
      aiDirective: 'Write a community-connection challenge for students to do at home related to the social studies topic. Add a one-sentence preview of the next lesson.',
    },
  ],
};

// ── TEMPLATE 5 — Spark Lab (STEAM / Inquiry, Grades 4–6) ────────────────────

const sparkLab: PresentationTemplate = {
  id: 'spark-lab',
  name: 'Spark Lab',
  tagline: 'STEAM & Inquiry',
  subject: 'STEAM',
  gradeBand: '4–6',
  colorTheme: 'purple',
  primaryHex: '#5B2D8E',
  accentHex: '#00B5AD',
  slideCount: 9,
  systemPromptPrefix: `You are designing a STEAM inquiry-based presentation for grades 4–6.
Structure the lesson around a driving inquiry question.
Use the design-thinking cycle: Empathise → Define → Ideate → Prototype → Test.
Encourage cross-curricular thinking: connect the science concept to mathematics,
technology use, artistic design, and written communication.
Integrate Caribbean environmental or engineering contexts where possible
(renewable energy, coral reefs, hurricane resilience, food security).
Promote scientific habits of mind: questioning, observing, inferring, testing.`,
  events: [
    {
      eventNumber: 1, eventLabel: GAGNE_LABELS[1], slideType: 'title',
      slideTitle: 'Spark Lab: Mission Activated! \u{1F680}',
      teacherTip: 'Show a puzzling image, play a short video clip, or demonstrate a surprising phenomenon. Ask: "What do you notice? What do you wonder?"',
      aiDirective: 'Generate an inquiry hook: a puzzling real-world phenomenon, image description, or problem statement. Suitable for grades 4–6. One short paragraph.',
    },
    {
      eventNumber: 2, eventLabel: GAGNE_LABELS[2], slideType: 'content',
      slideTitle: 'Mission Briefing: Learning Goals \u{1F4CB}',
      teacherTip: 'Frame objectives across STEAM strands. Display the driving inquiry question prominently throughout the lesson.',
      aiDirective: 'Generate 5 objectives — one per STEAM strand (Science, Technology, Engineering, Arts, Maths) — all connected to the central inquiry topic.',
    },
    {
      eventNumber: 3, eventLabel: GAGNE_LABELS[3], slideType: 'guiding-questions',
      slideTitle: 'What Do You Wonder? \u{1F52D}',
      teacherTip: 'Use a "Notice & Wonder" routine. Post a photograph or object. Students write independently, then share. Build the inquiry wall from their questions.',
      aiDirective: 'Generate a Notice & Wonder prompt with a photograph description and 3 seed questions to stimulate student inquiry about the STEAM topic.',
    },
    {
      eventNumber: 4, eventLabel: GAGNE_LABELS[4], slideType: 'content',
      slideTitle: 'Discover & Investigate \u{2697}\u{FE0F}',
      teacherTip: 'Keep direct instruction under 10 minutes. Use demonstration, short video, or specimen. Introduce vocabulary in context, not in isolation.',
      aiDirective: 'Present the core STEAM concept (2–3 sentences). Suggest a 5-minute demonstration or investigation starter. Provide 3 key STEAM vocabulary terms with definitions.',
    },
    {
      eventNumber: 5, eventLabel: GAGNE_LABELS[5], slideType: 'activity',
      slideTitle: 'Build & Explore Together \u{1F6E0}\u{FE0F}',
      teacherTip: 'Students work in design teams. Teacher circulates and asks guiding questions, not answers. Document with photos or sketches.',
      aiDirective: 'Design a guided team investigation (3–4 steps) where students explore the STEAM concept with teacher facilitation. Include a guiding question for each step.',
    },
    {
      eventNumber: 6, eventLabel: GAGNE_LABELS[6], slideType: 'activity',
      slideTitle: 'Design & Create! \u{1F3A8}',
      teacherTip: 'Teams execute their prototype or experiment. Students record in science notebooks: hypothesis, observations, data, sketches. Teacher observes and documents.',
      aiDirective: 'Design a student-led making/testing task. Include: materials list (simple, locally available), procedure (4–6 steps), and a data-recording prompt.',
    },
    {
      eventNumber: 7, eventLabel: GAGNE_LABELS[7], slideType: 'reflection',
      slideTitle: 'Test & Reflect \u{1F9EA}',
      teacherTip: 'Teams present results or test prototypes. Use structured peer feedback: "I like… I wonder… What if…?" Identify what to improve before next iteration.',
      aiDirective: 'Generate peer-feedback prompts for STEAM: "I like…", "I wonder…", "What if…?" plus 2 reflection questions about the investigation process.',
    },
    {
      eventNumber: 8, eventLabel: GAGNE_LABELS[8], slideType: 'reflection',
      slideTitle: 'Show What You Know \u{1F4CA}',
      teacherTip: 'Individual reflection: concept map, annotated diagram, or engineering journal entry. Prompts: What worked? What would I change? What did I learn?',
      aiDirective: 'Generate 3 STEAM reflection prompts for individual written assessment: one about the concept, one about the process, one about real-world application.',
    },
    {
      eventNumber: 9, eventLabel: GAGNE_LABELS[9], slideType: 'closing',
      slideTitle: 'Innovate & Apply! \u{1F680}',
      teacherTip: 'Ask: "How could this solution help our community?" Connect to a Caribbean environmental or engineering challenge. Plan a community showcase or next iteration.',
      aiDirective: 'Write a community-innovation challenge connecting the STEAM topic to a Caribbean environmental or social need. Add a one-sentence bridge to the next inquiry.',
    },
  ],
};

// ── REGISTRY ─────────────────────────────────────────────────────────────────

export const PRESENTATION_TEMPLATES: Record<string, PresentationTemplate | null> = {
  'wonder-world': wonderWorld,
  'story-builders': storyBuilders,
  'number-ninjas': numberNinjas,
  'heart-heritage': heartHeritage,
  'spark-lab': sparkLab,
  'default': null,
};

export function getTemplate(id: TemplateId): PresentationTemplate | null {
  return PRESENTATION_TEMPLATES[id] ?? null;
}

export function getTemplateList(): Array<{
  id: TemplateId;
  name: string;
  tagline: string;
  gradeBand: string;
  primaryHex: string;
  accentHex: string;
}> {
  return Object.entries(PRESENTATION_TEMPLATES)
    .filter(([, v]) => v !== null)
    .map(([id, t]) => ({
      id: id as TemplateId,
      name: (t as PresentationTemplate).name,
      tagline: (t as PresentationTemplate).tagline,
      gradeBand: (t as PresentationTemplate).gradeBand,
      primaryHex: (t as PresentationTemplate).primaryHex,
      accentHex: (t as PresentationTemplate).accentHex,
    }));
}
