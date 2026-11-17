export type TeamworkProject = {
    id: number;
    name: string;
    enabled: boolean;
    url: string | null;
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
