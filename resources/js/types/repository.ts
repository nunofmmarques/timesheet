export type RepositoryRecord = {
    id: number;
    name: string;
    path: string;
    enabled: boolean;
    teamworkProjectId: number | null;
    teamworkProjectName: string | null;
    teamworkProjectUrl: string | null;
};
