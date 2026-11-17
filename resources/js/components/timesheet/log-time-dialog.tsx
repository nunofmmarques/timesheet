import { router, useForm } from "@inertiajs/react";
import {
    CheckIcon,
    FolderKanbanIcon,
    ListTodoIcon,
    SearchIcon,
    TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ConfirmDeleteButton } from "@/components/timesheet/sheet-actions";
import { TeamworkLogo } from "@/components/timesheet/teamwork-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { formatDuration } from "@/lib/timesheet";
import type { TeamworkProject, TimesheetLog } from "@/types/teamwork";

type TeamworkTask = {
    id: number;
    name: string;
    tasklist: string;
    ancestors: string[];
};

export function LogTimeDialog({
    open,
    onOpenChange,
    projectId,
    projects = [],
    projectName,
    rowKey,
    date,
    dateLabel,
    start,
    end,
    minutes,
    logged,
    editing = null,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number | null;
    projects?: TeamworkProject[];
    projectName: string;
    rowKey: string;
    date: string;
    dateLabel: string;
    start: string | null;
    end: string | null;
    minutes: number;
    logged: TimesheetLog[];
    editing?: {
        id: number;
        taskId: number;
        taskName: string;
        billable: boolean;
    } | null;
}) {
    const form = useForm({
        project_id: projectId ?? 0,
        task_id: editing?.taskId ?? 0,
        date,
        start: start ?? "",
        end: end ?? "",
        billable: editing?.billable ?? true,
    });
    const [chosenProject, setChosenProject] = useState<number | null>(
        projectId,
    );
    const [projectQuery, setProjectQuery] = useState("");
    const [tasks, setTasks] = useState<TeamworkTask[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const needle = query.trim().toLowerCase();
    const visible = (tasks ?? []).filter((task) => {
        if (needle === "") {
            return true;
        }

        return [task.tasklist, ...task.ancestors, task.name]
            .join(" ")
            .toLowerCase()
            .includes(needle);
    });
    const selected = (tasks ?? []).find(
        (task) => task.id === form.data.task_id,
    );
    const currentTask =
        editing &&
        form.data.task_id === editing.taskId &&
        editing.taskName !== ""
            ? editing.taskName
            : null;
    const span = minutesBetween(form.data.start, form.data.end);
    const conflicts = overlappingLogs(
        logged,
        form.data.start,
        form.data.end,
        editing?.id,
    );
    const projectNeedle = projectQuery.trim().toLowerCase();
    const loggedProjectIds = useMemo(() => {
        const ids: number[] = [];

        for (const entry of logged) {
            if (entry.projectId === null || ids.includes(entry.projectId)) {
                continue;
            }

            ids.push(entry.projectId);
        }

        return ids;
    }, [logged]);
    const loggedTaskIds = useMemo(() => {
        const ids: number[] = [];

        for (const entry of logged) {
            if (
                entry.projectId !== chosenProject ||
                entry.taskId === null ||
                ids.includes(entry.taskId)
            ) {
                continue;
            }

            ids.push(entry.taskId);
        }

        return ids;
    }, [logged, chosenProject]);
    const visibleProjects = useMemo(() => {
        const matches = projects.filter((project) => {
            if (!project.enabled && project.id !== chosenProject) {
                return false;
            }

            return projectNeedle === ""
                ? true
                : project.name.toLowerCase().includes(projectNeedle);
        });
        const suggested = loggedProjectIds
            .map((id) => matches.find((project) => project.id === id))
            .filter((project) => project !== undefined);
        const rest = matches.filter(
            (project) => !loggedProjectIds.includes(project.id),
        );

        return { suggested, rest };
    }, [projects, projectNeedle, loggedProjectIds, chosenProject]);
    const visibleTasks = useMemo(() => {
        const suggested = loggedTaskIds
            .map((id) => visible.find((task) => task.id === id))
            .filter((task) => task !== undefined);
        const rest = visible.filter((task) => !loggedTaskIds.includes(task.id));

        return { suggested, rest };
    }, [visible, loggedTaskIds]);
    const chosenName =
        projects.find((project) => project.id === chosenProject)?.name ??
        (projectId !== null ? projectName : "");
    const suggestion =
        start !== null && end !== null
            ? `${dateLabel} · ${start}–${end} · ${formatDuration(minutes)}`
            : dateLabel;

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            project_id: projectId ?? 0,
            task_id: editing?.taskId ?? 0,
            date,
            start: start ?? "",
            end: end ?? "",
            billable: editing?.billable ?? true,
        });
        form.clearErrors();
        setQuery("");
        setProjectQuery("");
        setChosenProject(projectId);
        setTasks(null);
        setLoadError(null);
    }, [open, projectId, editing?.id]);

    useEffect(() => {
        if (!open || chosenProject === null) {
            return;
        }

        form.setData("project_id", chosenProject);
        setTasks(null);
        setLoadError(null);

        const controller = new AbortController();

        fetch(`/teamwork/projects/${chosenProject}/tasks`, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
        })
            .then(async (response) => {
                const body = (await response.json()) as {
                    tasks?: TeamworkTask[];
                    message?: string;
                };

                if (!response.ok || !Array.isArray(body.tasks)) {
                    throw new Error(
                        body.message ?? "Teamwork tasks could not be loaded.",
                    );
                }

                setTasks(body.tasks);
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return;
                }

                setLoadError("Teamwork tasks could not be loaded.");
            });

        return () => controller.abort();
    }, [open, chosenProject, editing?.id]);

    function submit(event: FormEvent) {
        event.preventDefault();

        if (form.data.task_id === 0) {
            form.setError("task_id", "Choose a task.");

            return;
        }

        if (span === null) {
            form.setError("end", "End must be after the start.");

            return;
        }

        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (editing) {
            form.put(`/teamwork/time/${editing.id}`, options);

            return;
        }

        form.post("/teamwork/time", options);
    }

    function destroy() {
        if (editing === null) {
            return;
        }

        setDeleting(true);
        setDeleteError(null);
        router.delete(`/teamwork/time/${editing.id}`, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
            onError: (errors) => {
                setDeleteError(
                    errors.task_id ?? "Teamwork could not delete this time.",
                );
            },
            onFinish: () => setDeleting(false),
        });
    }

    function projectButton(project: TeamworkProject) {
        return (
            <Button
                key={project.id}
                type="button"
                variant={project.id === chosenProject ? "secondary" : "ghost"}
                className="h-auto w-full justify-start px-2 py-1.5"
                onClick={() => {
                    setChosenProject(project.id);
                    form.setData({
                        ...form.data,
                        project_id: project.id,
                        task_id: 0,
                    });
                    setQuery("");
                }}
            >
                <FolderKanbanIcon />
                <span className="truncate">{project.name}</span>
                {project.id === chosenProject && (
                    <CheckIcon className="ml-auto" />
                )}
            </Button>
        );
    }

    function taskButton(task: TeamworkTask) {
        return (
            <Button
                key={task.id}
                type="button"
                variant={task.id === form.data.task_id ? "secondary" : "ghost"}
                className="h-auto w-full justify-start px-2 py-1.5"
                onClick={() => form.setData("task_id", task.id)}
            >
                <ListTodoIcon />
                <span className="flex min-w-0 flex-col items-start">
                    <span className="truncate">{taskPath(task)}</span>
                    {task.tasklist !== "" && (
                        <span className="truncate text-muted-foreground">
                            {task.tasklist}
                        </span>
                    )}
                </span>
            </Button>
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    setDeleteError(null);
                }

                onOpenChange(next);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TeamworkLogo variant="slate" />
                        {editing ? "Edit time" : "Log time"}
                    </DialogTitle>
                    <DialogDescription>
                        {projectId === null ? (
                            dateLabel
                        ) : (
                            <>
                                {projectName}.
                                {!editing && (
                                    <>
                                        <br />
                                        <span className="text-xs">
                                            Suggested: {suggestion}.
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <form className="flex flex-col gap-4" onSubmit={submit}>
                    <FieldGroup>
                        {projectId === null && (
                            <Field>
                                <FieldLabel
                                    className="items-center"
                                    htmlFor={`project-search-${rowKey}`}
                                >
                                    <FolderKanbanIcon className="size-3.5" />
                                    Project
                                </FieldLabel>
                                <InputGroup className="!rounded-b-none border-b-0 -mb-2">
                                    <InputGroupAddon>
                                        <SearchIcon />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        id={`project-search-${rowKey}`}
                                        value={projectQuery}
                                        placeholder="Search projects"
                                        onChange={(event) =>
                                            setProjectQuery(event.target.value)
                                        }
                                    />
                                </InputGroup>
                                <ScrollArea className="h-40 rounded-b-lg border">
                                    {visibleProjects.suggested.length === 0 &&
                                        visibleProjects.rest.length === 0 && (
                                            <p className="px-3 py-2 text-muted-foreground">
                                                No projects match.
                                            </p>
                                        )}
                                    <div className="flex flex-col p-1">
                                        {visibleProjects.suggested.length >
                                            0 && (
                                            <p className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">
                                                Logged today
                                            </p>
                                        )}
                                        {visibleProjects.suggested.map(
                                            (project) => projectButton(project),
                                        )}
                                        {visibleProjects.suggested.length > 0 &&
                                            visibleProjects.rest.length > 0 && (
                                                <p className="px-2 pt-2 pb-0.5 text-xs font-medium text-muted-foreground">
                                                    All projects
                                                </p>
                                            )}
                                        {visibleProjects.rest.map((project) =>
                                            projectButton(project),
                                        )}
                                    </div>
                                </ScrollArea>
                                {chosenName !== "" && (
                                    <Alert>
                                        <CheckIcon />
                                        <AlertTitle>Selected</AlertTitle>
                                        <AlertDescription>
                                            {chosenName}
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <FieldError
                                    errors={
                                        form.errors.project_id
                                            ? [
                                                  {
                                                      message:
                                                          form.errors
                                                              .project_id,
                                                  },
                                              ]
                                            : undefined
                                    }
                                />
                            </Field>
                        )}
                        <Field>
                            <FieldLabel
                                className="items-center"
                                htmlFor={`task-search-${rowKey}`}
                            >
                                <ListTodoIcon className="size-3.5" />
                                Task
                            </FieldLabel>
                            <InputGroup className="!rounded-b-none border-b-0 -mb-2">
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                                <InputGroupInput
                                    id={`task-search-${rowKey}`}
                                    value={query}
                                    placeholder="Search tasks"
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                />
                            </InputGroup>
                            <ScrollArea className="h-56 rounded-b-lg border">
                                {chosenProject === null && (
                                    <p className="px-3 py-2 text-muted-foreground">
                                        Choose a project first.
                                    </p>
                                )}
                                {chosenProject !== null &&
                                    tasks === null &&
                                    loadError === null && (
                                        <p className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                                            <Spinner />
                                            Loading tasks
                                        </p>
                                    )}
                                {loadError !== null && (
                                    <p className="px-3 py-2 text-muted-foreground">
                                        {loadError}
                                    </p>
                                )}
                                {tasks !== null &&
                                    visibleTasks.suggested.length === 0 &&
                                    visibleTasks.rest.length === 0 && (
                                        <p className="px-3 py-2 text-muted-foreground">
                                            No tasks match.
                                        </p>
                                    )}
                                <div className="flex flex-col p-1">
                                    {visibleTasks.suggested.length > 0 && (
                                        <p className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">
                                            Logged today
                                        </p>
                                    )}
                                    {visibleTasks.suggested.map((task) =>
                                        taskButton(task),
                                    )}
                                    {visibleTasks.suggested.length > 0 &&
                                        visibleTasks.rest.length > 0 && (
                                            <p className="px-2 pt-2 pb-0.5 text-xs font-medium text-muted-foreground">
                                                All tasks
                                            </p>
                                        )}
                                    {visibleTasks.rest.map((task) =>
                                        taskButton(task),
                                    )}
                                </div>
                            </ScrollArea>
                            {(selected || currentTask) && (
                                <Alert>
                                    <CheckIcon />
                                    <AlertTitle>Selected</AlertTitle>
                                    <AlertDescription>
                                        {selected
                                            ? taskPath(selected)
                                            : currentTask}
                                        {selected &&
                                            selected.tasklist !== "" &&
                                            ` · ${selected.tasklist}`}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <FieldError
                                errors={
                                    form.errors.task_id
                                        ? [{ message: form.errors.task_id }]
                                        : undefined
                                }
                            />
                        </Field>
                        <div className="flex items-start gap-3">
                            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                                <Field>
                                    <FieldLabel htmlFor={`log-start-${rowKey}`}>
                                        Start
                                    </FieldLabel>
                                    <Input
                                        id={`log-start-${rowKey}`}
                                        type="time"
                                        value={form.data.start}
                                        aria-invalid={
                                            form.errors.start !== undefined
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                "start",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <FieldError
                                        errors={
                                            form.errors.start
                                                ? [
                                                      {
                                                          message:
                                                              form.errors.start,
                                                      },
                                                  ]
                                                : undefined
                                        }
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor={`log-end-${rowKey}`}>
                                        End
                                    </FieldLabel>
                                    <Input
                                        id={`log-end-${rowKey}`}
                                        type="time"
                                        value={form.data.end}
                                        aria-invalid={
                                            form.errors.end !== undefined
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                "end",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <FieldError
                                        errors={
                                            form.errors.end
                                                ? [{ message: form.errors.end }]
                                                : undefined
                                        }
                                    />
                                </Field>
                            </div>
                            <p className="mt-6 flex h-8 shrink-0 items-center text-sm font-medium tabular-nums">
                                {span !== null ? formatDuration(span) : "—"}
                            </p>
                        </div>
                        {conflicts.length > 0 && (
                            <Alert
                                variant="destructive"
                                className="motion-enter-alert"
                            >
                                <TriangleAlertIcon />
                                <AlertTitle>Already logged</AlertTitle>
                                <AlertDescription className="flex flex-col gap-1">
                                    {conflicts.map((entry) => (
                                        <span key={entry.id}>
                                            {entry.time}–
                                            {clock(
                                                minutesFromClock(
                                                    entry.time ?? "",
                                                ) + entry.minutes,
                                            )}
                                            {entry.project !== "" &&
                                                ` · ${entry.project}`}
                                            {entry.task !== "" &&
                                                ` · ${entry.task}`}
                                        </span>
                                    ))}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="flex items-start gap-3">
                            <div className="grid min-w-0 flex-1 grid-cols-3 gap-3">
                                <Field orientation="horizontal">
                                    <FieldLabel
                                        htmlFor={`log-billable-${rowKey}`}
                                    >
                                        Mark as billable
                                    </FieldLabel>
                                    <Switch
                                        id={`log-billable-${rowKey}`}
                                        checked={form.data.billable}
                                        onCheckedChange={(checked) =>
                                            form.setData("billable", checked)
                                        }
                                    />
                                </Field>
                            </div>
                        </div>
                    </FieldGroup>
                    {deleteError !== null && (
                        <Alert variant="destructive">
                            <TriangleAlertIcon />
                            <AlertTitle>Could not delete</AlertTitle>
                            <AlertDescription>{deleteError}</AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        {editing && (
                            <ConfirmDeleteButton
                                key={open ? `delete-${editing.id}` : "closed"}
                                labeled
                                className="sm:mr-auto"
                                label={`Delete ${editing.taskName || "time"}`}
                                disabled={form.processing}
                                busy={deleting}
                                onConfirm={() => {
                                    setDeleteError(null);
                                    destroy();
                                }}
                            />
                        )}
                        <Button
                            type="submit"
                            disabled={form.processing || deleting}
                        >
                            {form.processing && (
                                <Spinner data-icon="inline-start" />
                            )}
                            {editing ? "Save" : "Log"}{" "}
                            {span !== null ? formatDuration(span) : "time"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function taskPath(task: TeamworkTask): string {
    return [...task.ancestors, task.name].join(" / ");
}

function minutesBetween(start: string, end: string): number | null {
    const startMinutes = minutesFromClock(start);
    const endMinutes = minutesFromClock(end);

    if (
        startMinutes === null ||
        endMinutes === null ||
        endMinutes <= startMinutes
    ) {
        return null;
    }

    return endMinutes - startMinutes;
}

function minutesFromClock(value: string): number | null {
    const parts = value.split(":");

    if (parts.length < 2) {
        return null;
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    return hours * 60 + minutes;
}

function clock(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function overlappingLogs(
    logged: TimesheetLog[],
    start: string,
    end: string,
    ignoreId?: number,
): TimesheetLog[] {
    const startMinutes = minutesFromClock(start);
    const endMinutes = minutesFromClock(end);

    if (
        startMinutes === null ||
        endMinutes === null ||
        endMinutes <= startMinutes
    ) {
        return [];
    }

    return logged.filter((entry) => {
        if (
            entry.id === ignoreId ||
            entry.time === null ||
            entry.minutes <= 0
        ) {
            return false;
        }

        const entryStart = minutesFromClock(entry.time);

        if (entryStart === null) {
            return false;
        }

        const entryEnd = entryStart + entry.minutes;

        return startMinutes < entryEnd && entryStart < endMinutes;
    });
}
