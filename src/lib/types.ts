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

export type Collection = 'tasks' | 'notes' | 'events' | 'memories' | 'drafts' | 'projects' | 'subjects' | 'sessions';
export type Item = Task | Note | CalEvent | Memory | Draft | Project | Subject | Session;

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

export interface Settings {
  lang: Lang;
  name: string;
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
  log: LogEntry[];
  settings: Settings;
}
