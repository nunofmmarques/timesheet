export type TimesheetCommit = {
    hash: string;
    shortHash: string;
    subject: string;
    time: string;
    authorName: string;
};

export type TimesheetSession = {
    key: string;
    repository: string;
    repositoryPath: string;
    startedAt: string;
    endedAt: string;
    estimatedMinutes: number;
    minutes: number;
    description: string;
    generatedDescription: string;
    included: boolean;
    commits: TimesheetCommit[];
};

export type TimesheetDay = {
    date: string;
    label: string;
    sessions: TimesheetSession[];
};

export type RepositoryRecord = {
    id: number;
    name: string;
    path: string;
    enabled: boolean;
};

export type TimesheetSettings = {
    authorEmail: string;
    idleGapMinutes: number;
    paddingMinutes: number;
    minimumMinutes: number;
    roundToMinutes: number;
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
    settings: TimesheetSettings;
    discoverRoot: string;
    discoverRoots: string[];
    commitCount: number;
};

export type SessionDraft = {
    minutes: number;
    description: string;
    included: boolean;
};
