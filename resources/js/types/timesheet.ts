import type { ConstantTask } from "@/types/constant-task";
import type { DayNote } from "@/types/day-note";
import type { Holiday } from "@/types/holiday";
import type { RepositoryRecord } from "@/types/repository";
import type { TimesheetSettings } from "@/types/settings";
import type { TeamworkProject, TimesheetLog } from "@/types/teamwork";
import type { DayAbsence, TimeOff } from "@/types/time-off";

export type TimesheetCommit = {
    hash: string;
    shortHash: string;
    subject: string;
    time: string;
    authorName: string;
    branch: string;
};

export type TimesheetProject = {
    repository: string;
    repositoryPath: string;
    minutes: number;
    spentMinutes: number;
    commits: TimesheetCommit[];
};

export type TimesheetBlock = {
    repository: string;
    start: string;
    end: string;
    minutes: number;
};

export type TimesheetWindow = {
    start: string;
    end: string;
};

export type TimesheetDay = {
    date: string;
    label: string;
    capacityMinutes: number;
    windows: TimesheetWindow[];
    blocks: TimesheetBlock[];
    projects: TimesheetProject[];
    loggedMinutes: number;
    logged: TimesheetLog[];
    absence: DayAbsence | null;
    notes: DayNote[];
};

export type TimesheetProblem = {
    repository: string;
    message: string;
};

export type TimesheetPageProps = {
    from: string;
    to: string;
    preset: string;
    days: TimesheetDay[];
    problems: TimesheetProblem[];
    repositories: RepositoryRecord[];
    teamworkProjects: TeamworkProject[];
    teamworkError: string | null;
    teamworkTimeError: string | null;
    teamworkConfigured: boolean;
    holidays: Holiday[];
    absences: TimeOff[];
    notes: DayNote[];
    constants: ConstantTask[];
    settings: TimesheetSettings;
    discoverRoot: string;
    discoverRoots: string[];
};
