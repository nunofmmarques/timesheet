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

export type TimesheetLog = {
    id: number;
    time: string | null;
    minutes: number;
    description: string;
    project: string;
    projectId: number | null;
    task: string;
    taskId: number | null;
    projectUrl: string | null;
    taskUrl: string | null;
    billable: boolean;
};

export type ConstantTask = {
    id: number;
    weekday: number;
    start: string;
    end: string;
    projectId: number;
    projectName: string;
    taskId: number;
    taskName: string;
    billable: boolean;
    skippedDates: string[];
};

export type TimeOff = {
    id: number;
    kind: string;
    label: string;
    note: string;
    startsOn: string;
    endsOn: string;
};

export type DayAbsence = {
    id: number;
    kind: string;
    label: string;
    note: string;
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
};

export type RepositoryRecord = {
    id: number;
    name: string;
    path: string;
    enabled: boolean;
    teamworkProjectId: number | null;
    teamworkProjectName: string | null;
    teamworkProjectUrl: string | null;
};

export type TeamworkProject = {
    id: number;
    name: string;
};

export type TimesheetSettings = {
    authorEmail: string;
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
    absences: TimeOff[];
    constants: ConstantTask[];
    settings: TimesheetSettings;
    discoverRoot: string;
    discoverRoots: string[];
};
