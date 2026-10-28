export type ISODate = string;   // "2026-10-29" (local day)
export type ISOTime = string;   // "08:00"
export type Timestamp = string; // UTC instant

export type Base = {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
};

export type Item = Base & {
  text: string;
  status: "inbox" | "active" | "done" | "archived";
  source: "quick" | "share" | "app" | "import";
  notes?: string;
  scheduledFor?: ISODate;
  scheduledTime?: ISOTime;
  sortOrder?: number;
  dueOn?: ISODate;
  remindAt?: Timestamp;
  projectId?: string;
  completedAt?: Timestamp;
  completedOn?: ISODate;
};

export type Schedule = {
  effectiveFrom: ISODate;
  daysOfWeek: number[]; // 0=Sun ... 6=Sat
  time?: ISOTime;
};

export type Recurrence = Base & {
  text: string;
  category?: "Health" | "Skills" | "Money";
  schedules: Schedule[];
  startDate: ISODate;
  endDate?: ISODate;
  paused: boolean;
  projectId?: string;
  goalId?: string;
};

export type Completion = Base & {
  recurrenceId: string;
  date: ISODate;
  completedAt: Timestamp;
};

export type Project = Base & {
  name: string;
  notes?: string;
  goalId?: string;
  status: "active" | "paused" | "done";
};

export type Goal = Base & {
  name: string;
  why?: string;
  targetDate?: ISODate;
  status: "active" | "done" | "dropped";
};

export type JournalEntry = Base & {
  date: ISODate;
  time: ISOTime;
  text: string;
};