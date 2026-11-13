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
