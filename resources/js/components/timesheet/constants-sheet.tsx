import { router, useForm } from '@inertiajs/react';
import { PencilIcon, PlusIcon, RepeatIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { formatDuration } from '@/lib/timesheet';
import type { ConstantTask, TeamworkProject } from '@/types/timesheet';

const WEEKDAYS = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '7', label: 'Sunday' },
];

type TeamworkTask = {
    id: number;
    name: string;
    tasklist: string;
    ancestors: string[];
};

export function ConstantsSheet({
    constants,
    projects,
    configured,
    error,
}: {
    constants: ConstantTask[];
    projects: TeamworkProject[];
    configured: boolean;
    error: string | null;
}) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<ConstantTask | null>(null);
    const formOpen = adding || editing !== null;

    function closeForm() {
        setAdding(false);
        setEditing(null);
    }

    return (
        <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
                <RepeatIcon data-icon="inline-start" />
                Constants
            </SheetTrigger>
            <SheetContent className="data-[side=right]:sm:max-w-md">
                <SheetHeader className="pb-0">
                    <SheetTitle>Constant tasks</SheetTitle>
                    <SheetDescription>
                        A task you log on the same weekday, with a fixed start
                        and end. Matching days get a button to log it.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                    {constants.length > 0 && (
                        <ul className="flex flex-col divide-y rounded-lg border">
                            {constants.map((constant) => (
                                <li
                                    key={constant.id}
                                    className="flex items-start gap-2 px-3 py-2 text-sm"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="font-medium">
                                            {weekdayLabel(constant.weekday)} ·{' '}
                                            {constant.start}–{constant.end}
                                        </span>
                                        <span className="block text-muted-foreground">
                                            {constant.projectName} ·{' '}
                                            {constant.taskName}
                                            {constant.billable
                                                ? ''
                                                : ' · Non-billable'}
                                        </span>
                                        {constant.skippedDates.length > 0 && (
                                            <span className="mt-1 flex flex-wrap items-center gap-1">
                                                {constant.skippedDates.map(
                                                    (date) => (
                                                        <Button
                                                            key={date}
                                                            type="button"
                                                            size="xs"
                                                            variant="secondary"
                                                            aria-label={`Show ${shortDate(date)} again`}
                                                            onClick={() =>
                                                                router.delete(
                                                                    `/constants/${constant.id}/skips/${date}`,
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            Ignored{' '}
                                                            {shortDate(date)}
                                                        </Button>
                                                    ),
                                                )}
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex shrink-0 items-center">
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label={`Edit ${constant.taskName}`}
                                            onClick={() => {
                                                setAdding(false);
                                                setEditing(constant);
                                            }}
                                        >
                                            <PencilIcon />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label={`Remove ${constant.taskName}`}
                                            onClick={() =>
                                                router.delete(
                                                    `/constants/${constant.id}`,
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {formOpen ? (
                        <ConstantForm
                            key={editing?.id ?? 'new'}
                            constant={editing}
                            projects={projects}
                            configured={configured}
                            error={error}
                            onDone={closeForm}
                        />
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setEditing(null);
                                setAdding(true);
                            }}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Add constant
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function ConstantForm({
    constant,
    projects,
    configured,
    error,
    onDone,
}: {
    constant: ConstantTask | null;
    projects: TeamworkProject[];
    configured: boolean;
    error: string | null;
    onDone: () => void;
}) {
    const form = useForm({
        weekday: constant?.weekday ?? 5,
        start: constant?.start ?? '14:00',
        end: constant?.end ?? '18:00',
        project_id: constant?.projectId ?? 0,
        task_id: constant?.taskId ?? 0,
        billable: constant?.billable ?? false,
    });
    const [projectQuery, setProjectQuery] = useState('');
    const [taskQuery, setTaskQuery] = useState('');
    const [tasks, setTasks] = useState<TeamworkTask[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const project = projects.find(
        (item) => item.id === form.data.project_id,
    );
    const projectNeedle = projectQuery.trim().toLowerCase();
    const visibleProjects = projects.filter((item) =>
        projectNeedle === ''
            ? true
            : item.name.toLowerCase().includes(projectNeedle),
    );
    const taskNeedle = taskQuery.trim().toLowerCase();
    const visibleTasks = (tasks ?? []).filter((task) => {
        if (taskNeedle === '') {
            return true;
        }

        return [task.tasklist, ...task.ancestors, task.name]
            .join(' ')
            .toLowerCase()
            .includes(taskNeedle);
    });
    const selected = (tasks ?? []).find((task) => task.id === form.data.task_id);
    const span = minutesBetween(form.data.start, form.data.end);
    const disabled = !configured || error !== null;

    useEffect(() => {
        if (form.data.project_id === 0) {
            return;
        }

        const controller = new AbortController();

        fetch(`/teamwork/projects/${form.data.project_id}/tasks`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Teamwork tasks could not be loaded.');
                }

                const payload = (await response.json()) as {
                    tasks?: TeamworkTask[];
                };

                setTasks(payload.tasks ?? []);
                setLoadError(null);
            })
            .catch((reason: unknown) => {
                if (reason instanceof DOMException && reason.name === 'AbortError') {
                    return;
                }

                setTasks([]);
                setLoadError('Teamwork tasks could not be loaded.');
            });

        return () => controller.abort();
    }, [form.data.project_id]);

    function chooseProject(projectId: number) {
        setTasks(null);
        setLoadError(null);
        setTaskQuery('');
        form.setData({
            ...form.data,
            project_id: projectId,
            task_id: 0,
        });
    }

    return (
        <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                const options = {
                    preserveScroll: true,
                    onSuccess: () => {
                        form.reset();
                        setProjectQuery('');
                        setTaskQuery('');
                        setTasks(null);
                        onDone();
                    },
                };

                if (constant === null) {
                    form.post('/constants', options);
                } else {
                    form.put(`/constants/${constant.id}`, options);
                }
            }}
        >
            <FieldGroup>
                <Field>
                    <FieldLabel>Weekday</FieldLabel>
                    <Select
                        value={String(form.data.weekday)}
                        onValueChange={(value) => {
                            if (typeof value === 'string') {
                                form.setData('weekday', Number(value));
                            }
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue>
                                {(value: string | null) =>
                                    WEEKDAYS.find((day) => day.value === value)
                                        ?.label ?? 'Weekday'
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                            {WEEKDAYS.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                    {day.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError
                        errors={
                            form.errors.weekday
                                ? [{ message: form.errors.weekday }]
                                : undefined
                        }
                    />
                </Field>
                <div className="flex items-start gap-3">
                    <Field>
                        <FieldLabel htmlFor="constant-start">Start</FieldLabel>
                        <Input
                            id="constant-start"
                            type="time"
                            value={form.data.start}
                            onChange={(event) =>
                                form.setData('start', event.target.value)
                            }
                        />
                        <FieldError
                            errors={
                                form.errors.start
                                    ? [{ message: form.errors.start }]
                                    : undefined
                            }
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="constant-end">End</FieldLabel>
                        <Input
                            id="constant-end"
                            type="time"
                            value={form.data.end}
                            aria-invalid={form.errors.end !== undefined}
                            onChange={(event) =>
                                form.setData('end', event.target.value)
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
                    <p className="mt-6 flex h-8 shrink-0 items-center text-sm font-medium tabular-nums">
                        {span !== null ? formatDuration(span) : '—'}
                    </p>
                </div>
                <Field>
                    <FieldLabel htmlFor="constant-project">
                        Teamwork project
                    </FieldLabel>
                    {project !== undefined && (
                        <p className="text-sm font-medium">{project.name}</p>
                    )}
                    <InputGroup>
                        <InputGroupAddon>
                            <SearchIcon />
                        </InputGroupAddon>
                        <InputGroupInput
                            id="constant-project"
                            value={projectQuery}
                            placeholder="Search projects"
                            disabled={disabled}
                            onChange={(event) =>
                                setProjectQuery(event.target.value)
                            }
                        />
                    </InputGroup>
                    <ScrollArea className="h-36 rounded-lg border">
                        {visibleProjects.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                {disabled
                                    ? 'Teamwork projects are not available.'
                                    : 'No projects match.'}
                            </p>
                        )}
                        <div className="flex flex-col p-1">
                            {visibleProjects.map((item) => (
                                <Button
                                    key={item.id}
                                    type="button"
                                    variant={
                                        item.id === form.data.project_id
                                            ? 'secondary'
                                            : 'ghost'
                                    }
                                    className="h-auto w-full justify-start px-2 py-1.5"
                                    onClick={() => chooseProject(item.id)}
                                >
                                    <span className="truncate">{item.name}</span>
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                    <FieldError
                        errors={
                            form.errors.project_id
                                ? [{ message: form.errors.project_id }]
                                : undefined
                        }
                    />
                </Field>
                {form.data.project_id !== 0 && (
                    <Field>
                        <FieldLabel htmlFor="constant-task">Task</FieldLabel>
                        {selected !== undefined && (
                            <p className="text-sm">
                                <span className="font-medium">
                                    {taskPath(selected)}
                                </span>
                                {selected.tasklist !== '' && (
                                    <span className="block text-muted-foreground">
                                        {selected.tasklist}
                                    </span>
                                )}
                            </p>
                        )}
                        <InputGroup>
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="constant-task"
                                value={taskQuery}
                                placeholder="Search tasks"
                                onChange={(event) =>
                                    setTaskQuery(event.target.value)
                                }
                            />
                        </InputGroup>
                        <ScrollArea className="h-36 rounded-lg border">
                            {tasks === null && (
                                <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                                    <Spinner />
                                    Loading tasks
                                </p>
                            )}
                            {loadError !== null && (
                                <p className="px-3 py-2 text-sm text-destructive">
                                    {loadError}
                                </p>
                            )}
                            {tasks !== null && visibleTasks.length === 0 && (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                    No tasks match.
                                </p>
                            )}
                            <div className="flex flex-col p-1">
                                {visibleTasks.map((task) => (
                                    <Button
                                        key={task.id}
                                        type="button"
                                        variant={
                                            task.id === form.data.task_id
                                                ? 'secondary'
                                                : 'ghost'
                                        }
                                        className="h-auto w-full justify-start px-2 py-1.5"
                                        onClick={() =>
                                            form.setData('task_id', task.id)
                                        }
                                    >
                                        <span className="min-w-0 text-left">
                                            <span className="block truncate">
                                                {taskPath(task)}
                                            </span>
                                            {task.tasklist !== '' && (
                                                <span className="block truncate text-muted-foreground">
                                                    {task.tasklist}
                                                </span>
                                            )}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                        <FieldError
                            errors={
                                form.errors.task_id
                                    ? [{ message: form.errors.task_id }]
                                    : undefined
                            }
                        />
                    </Field>
                )}
                <Field orientation="horizontal">
                    <FieldLabel htmlFor="constant-billable">
                        Mark as billable
                    </FieldLabel>
                    <Switch
                        id="constant-billable"
                        checked={form.data.billable}
                        onCheckedChange={(checked) =>
                            form.setData('billable', checked)
                        }
                    />
                </Field>
            </FieldGroup>
            <div className="flex items-center gap-2">
                <Button
                    type="submit"
                    disabled={form.processing || form.data.task_id === 0}
                >
                    {form.processing && <Spinner data-icon="inline-start" />}
                    {constant === null ? 'Save constant' : 'Save changes'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={form.processing}
                    onClick={onDone}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function shortDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
    });
}

function weekdayLabel(weekday: number): string {
    return WEEKDAYS.find((day) => Number(day.value) === weekday)?.label ?? 'Day';
}

function taskPath(task: TeamworkTask): string {
    return [...task.ancestors, task.name].join(' / ');
}

function minutesBetween(start: string, end: string): number | null {
    const startMinutes = minutesFromClock(start);
    const endMinutes = minutesFromClock(end);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return null;
    }

    return endMinutes - startMinutes;
}

function minutesFromClock(clock: string): number | null {
    const match = /^(\d{2}):(\d{2})/.exec(clock);

    if (match === null) {
        return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
}
