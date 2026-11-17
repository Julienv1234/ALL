export type Lang = 'nl' | 'en';

export interface Task {
  id: string;
  title: string;
  project: string;
  due: string; // YYYY-MM-DD or ''
  done: boolean;
  createdAt: string;
  doneAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD, the first time it happens
  time: string; // HH:MM or '' for all day
  place: string;
  repeat: Repeat;
  until: string; // YYYY-MM-DD last possible date, or '' for no end
  skip: string[]; // dates left out of a repeating series
  uid: string; // set when imported from a calendar file, to avoid doubles
  createdAt: string;
}

export interface Memory {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** A school subject or anything you are learning. */
export interface Subject {
  id: string;
  name: string;
  goal: string;
  exam: string; // YYYY-MM-DD of the next exam or deadline, or ''
  weeklyMinutes: number; // what you want to study per week, 0 = no target
  archived: boolean;
  createdAt: string;
}

/** Time spent studying. */
export interface Session {
  id: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  note: string;
  createdAt: string;
}

/** Extra details for a project. Tasks point to a project by its name. */
export interface Project {
  id: string;
  name: string;
  goal: string;
  deadline: string; // YYYY-MM-DD or ''
  archived: boolean;
  createdAt: string;
}

/** Something you want to do regularly. Done days are kept inside the habit. */
export interface Habit {
  id: string;
  name: string;
  days: number[]; // weekdays it is planned, 0 = Monday ... 6 = Sunday; empty = every day
  done: string[]; // YYYY-MM-DD days it was done
  archived: boolean;
  createdAt: string;
}

/** When a workflow rule fires. */
export type RuleWhen =
  | { type: 'daily' }
  | { type: 'weekly'; weekday: number } // 0 = Monday
  | { type: 'monthly'; day: number } // 1..28
  | { type: 'examSoon'; days: number }; // once per exam, this many days before it

/** A workflow without AI: when X happens, make a task or note (as a draft unless you chose otherwise). */
export interface Rule {
  id: string;
  name: string;
  when: RuleWhen;
  kind: 'task' | 'note';
  title: string; // may hold {vak} and {datum}
  project: string;
  dueIn: number; // task deadline this many days after it fires, -1 = no deadline
  direct: boolean; // false = draft first (default)
  enabled: boolean;
  runs: string[]; // keys of moments it already fired for, newest first
  createdAt: string;
}

export type SiteTemplate = 'neon' | 'licht' | 'krant';

/** A small website you build from a template and download as one HTML file. */
export interface Site {
  id: string;
  name: string;
  template: SiteTemplate;
  accent: string; // #RRGGBB
  title: string;
  tagline: string;
  about: string;
  sections: { heading: string; text: string }[];
  links: { label: string; url: string }[];
  footer: string;
  createdAt: string;
  updatedAt: string;
}

export type Access = 'none' | 'read' | 'draft';
export type AgentArea = 'tasks' | 'agenda' | 'notes' | 'memory' | 'learn' | 'habits';

/** An agent's job description and permissions. It runs once the Claude API is connected (phase 2). */
export interface Agent {
  id: string;
  name: string;
  template: string;
  instructions: string;
  can: Record<AgentArea, Access>;
  schedule: string; // HH:MM every day, or '' for only when you ask
  enabled: boolean;
  lastRun: string; // YYYY-MM-DD it last ran on its schedule, or ''
  createdAt: string;
}

/** Something ALL proposes; nothing happens until you approve it. */
export interface Draft {
  id: string;
  kind: 'task' | 'event' | 'note' | 'memory';
  title: string;
  date: string;
  time: string;
  repeat: Repeat;
  project: string;
  body: string;
  source: string; // what you typed, or later: which agent proposed it
  createdAt: string;
}

export type Collection = 'tasks' | 'notes' | 'events' | 'memories' | 'drafts' | 'projects' | 'subjects' | 'sessions' | 'habits' | 'rules' | 'sites' | 'agents';
export type Item = Task | Note | CalEvent | Memory | Draft | Project | Subject | Session | Habit | Rule | Site | Agent;

/** How to undo a logged action. */
export type Undo =
  | { type: 'remove'; collection: Collection; id: string }
  | { type: 'restore'; collection: Collection; item: Item }
  | { type: 'replace'; collection: Collection; item: Item }
  | { type: 'removeMany'; collection: Collection; ids: string[] };

export interface LogEntry {
  id: string;
  at: string;
  text: string;
  collection: Collection | 'app';
  undo?: Undo;
  undone?: boolean;
}

export interface Reminders {
  on: boolean;
  before: number; // minutes before an appointment
  tasks: boolean; // one message in the morning about tasks due today
}

export interface Settings {
  lang: Lang;
  name: string;
  remind: Reminders;
}

export interface State {
  v: 1;
  tasks: Task[];
  notes: Note[];
  events: CalEvent[];
  memories: Memory[];
  drafts: Draft[];
  projects: Project[];
  subjects: Subject[];
  sessions: Session[];
  habits: Habit[];
  rules: Rule[];
  sites: Site[];
  agents: Agent[];
  log: LogEntry[];
  settings: Settings;
}
