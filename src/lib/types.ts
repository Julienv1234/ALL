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

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or '' for all day
  place: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export type Collection = 'tasks' | 'notes' | 'events' | 'memories';
export type Item = Task | Note | CalEvent | Memory;

/** How to undo a logged action. */
export type Undo =
  | { type: 'remove'; collection: Collection; id: string }
  | { type: 'restore'; collection: Collection; item: Item }
  | { type: 'replace'; collection: Collection; item: Item };

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
  log: LogEntry[];
  settings: Settings;
}
