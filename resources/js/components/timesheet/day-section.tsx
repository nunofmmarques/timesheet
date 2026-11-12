import { router, useForm } from "@inertiajs/react";
import {
    CheckIcon,
    ChevronDownIcon,
    ClockIcon,
    EllipsisIcon,
    GitBranchIcon,
    GitCommitHorizontalIcon,
    PencilIcon,
    SearchIcon,
    TreePalmIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
    AbsenceIcon,
    absencePartLabel,
} from "@/components/timesheet/absence-kind";
import { LogTimeDialog } from "@/components/timesheet/log-time-dialog";
import { TimeOffForm } from "@/components/timesheet/time-off-sheet";
import { TeamworkLogo } from "@/components/timesheet/teamwork-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { formatDuration, todayInLisbon } from "@/lib/timesheet";
import { cn } from "@/lib/utils";
import type {
    AbsencePart,
    ConstantTask,
    RepositoryRecord,
    TeamworkProject,
    TimeOff,
    TimesheetCommit,
    TimesheetDay,
    TimesheetLog,
    TimesheetProject,
} from "@/types/timesheet";

const contentGrid =
    "grid grid-cols-[7.5rem_9rem_minmax(0,1fr)_auto] items-center gap-3";

export function DaySection({
    day,
    repositories,
    projects,
    teamworkConfigured,
    teamworkError,
    constants,
    absences,
}: {
    day: TimesheetDay;
    repositories: RepositoryRecord[];
    projects: TeamworkProject[];
    teamworkConfigured: boolean;
    teamworkError: string | null;
    constants: ConstantTask[];
    absences: TimeOff[];
}) {
    const rows =
        day.blocks.length > 0
            ? day.blocks.map((block) => {
                  const project = projectFor(day.projects, block.repository);
                  const repository = repositoryFor(
                      repositories,
                      project?.repositoryPath,
                      block.repository,
                  );

                  return {
                      key: `${block.repository}-${block.start}`,
                      label: block.repository,
                      meta: `${block.start}–${block.end}`,
                      start: block.start,
                      end: block.end,
                      minutes: block.minutes,
                      commits: project?.commits ?? [],
                      branches: branchNames(project?.commits ?? []),
                      repositoryId: repository?.id ?? null,
                      teamworkProjectId: repository?.teamworkProjectId ?? null,
                      teamworkProjectName:
                          repository?.teamworkProjectName ?? null,
                  };
              })
            : day.projects.map((project) => {
                  const repository = repositoryFor(
                      repositories,
                      project.repositoryPath,
                      project.repository,
                  );

                  return {
                      key: project.repositoryPath,
                      label: project.repository,
                      meta: null,
                      start: null,
                      end: null,
                      minutes: project.minutes,
                      commits: project.commits,
                      branches: branchNames(project.commits),
                      repositoryId: repository?.id ?? null,
                      teamworkProjectId: repository?.teamworkProjectId ?? null,
                      teamworkProjectName:
                          repository?.teamworkProjectName ?? null,
                  };
              });

    const fullDay = day.loggedMinutes >= 8 * 60;
    const today = day.date === todayInLisbon();
    const absenceRecord =
        day.absence === null
            ? null
            : (absences.find((item) => item.id === day.absence?.id) ?? null);
    const [timeOffOpen, setTimeOffOpen] = useState<"add" | "edit" | null>(null);
    const pending = constants.filter(
        (constant) =>
            constant.weekday === isoWeekday(day.date) &&
            !constant.skippedDates.includes(day.date) &&
            !day.logged.some((entry) => covers(entry, constant)) &&
            !absenceCovers(day.absence, constant),
    );
    return (
        <section
            id={`day-${day.date}`}
            className="flex scroll-mt-6 flex-col gap-3"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <h2
                        className={cn(
                            "font-heading text-base font-medium",
                            today && "text-tw-orange",
                        )}
                    >
                        {day.label}
                    </h2>
                    {today && (
                        <Badge className="bg-tw-orange text-white">Today</Badge>
                    )}
                    {fullDay && (
                        <Badge className="bg-green-600 text-white">
                            <CheckIcon data-icon="inline-start" />
                            8h logged
                        </Badge>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`More for ${day.label}`}
                            />
                        }
                    >
                        <EllipsisIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {absenceRecord !== null && (
                            <DropdownMenuItem
                                onClick={() => setTimeOffOpen("edit")}
                            >
                                <PencilIcon />
                                Edit time off
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setTimeOffOpen("add")}>
                            <TreePalmIcon />
                            Add time off
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Dialog
                open={timeOffOpen !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setTimeOffOpen(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {timeOffOpen === "edit"
                                ? "Edit time off"
                                : "Add time off"}
                        </DialogTitle>
                        <DialogDescription>{day.label}</DialogDescription>
                    </DialogHeader>
                    {timeOffOpen !== null && (
                        <TimeOffForm
                            key={`${timeOffOpen}-${absenceRecord?.id ?? day.date}`}
                            absence={
                                timeOffOpen === "edit" ? absenceRecord : null
                            }
                            initialDate={day.date}
                            onDone={() => setTimeOffOpen(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {day.absence !== null && <AbsenceTime absence={day.absence} />}

            {(day.logged.length > 0 || pending.length > 0) && (
                <LoggedTime day={day} fullDay={fullDay} pending={pending} />
            )}

            {rows.length > 0 && (
                <Collapsible
                    defaultOpen={!fullDay}
                    className="overflow-hidden rounded-xl bg-muted/50 ring-1 ring-foreground/10"
                >
                    <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium">
                        <GitCommitHorizontalIcon className="size-4" />
                        Git
                        <ChevronDownIcon className="ml-auto size-4 transition-transform in-aria-expanded:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="flex flex-col divide-y border-t bg-card">
                            {rows.map((row) => (
                                <Collapsible key={row.key}>
                                    <div className="flex items-center">
                                        <CollapsibleTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        contentGrid,
                                                        "h-auto min-w-0 flex-1 justify-start rounded-none border-0 px-3 py-2 text-left font-normal whitespace-normal",
                                                    )}
                                                />
                                            }
                                        >
                                            <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                                                {row.meta}
                                            </span>
                                            <span className="text-right whitespace-nowrap tabular-nums">
                                                {row.minutes > 0 && (
                                                    <>
                                                        <span className="text-muted-foreground">
                                                            to log{" "}
                                                        </span>
                                                        {formatDuration(
                                                            row.minutes,
                                                        )}
                                                    </>
                                                )}
                                            </span>
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="shrink-0 font-medium">
                                                    {row.label}
                                                </span>
                                                <BranchMark
                                                    branches={row.branches}
                                                />
                                                {row.teamworkProjectName !==
                                                    null && (
                                                    <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                                                        <TeamworkLogo
                                                            variant="transparent"
                                                            className="size-3.5"
                                                        />
                                                        <span className="truncate">
                                                            {
                                                                row.teamworkProjectName
                                                            }
                                                        </span>
                                                    </span>
                                                )}
                                            </span>
                                            <ChevronDownIcon className="transition-transform in-aria-expanded:rotate-180" />
                                        </CollapsibleTrigger>
                                        <TeamworkLink
                                            rowKey={row.key}
                                            label={row.label}
                                            date={day.date}
                                            dateLabel={day.label}
                                            start={row.start}
                                            end={row.end}
                                            minutes={row.minutes}
                                            commits={row.commits}
                                            logged={day.logged}
                                            repositoryId={row.repositoryId}
                                            projectId={row.teamworkProjectId}
                                            projectName={
                                                row.teamworkProjectName
                                            }
                                            projects={projects}
                                            canLink={
                                                teamworkConfigured &&
                                                teamworkError === null
                                            }
                                        />
                                    </div>
                                    <CollapsibleContent className="bg-muted/40 px-3 py-2">
                                        <CommitList
                                            commits={row.commits}
                                            showBranch={row.branches.length > 1}
                                        />
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </section>
    );
}

function AbsenceTime({
    absence,
}: {
    absence: NonNullable<TimesheetDay["absence"]>;
}) {
    const span = absenceSpan(absence.part);
    const part = absencePartLabel(absence.part);

    return (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-tw-purple/30">
            <div className="flex items-center gap-2 bg-tw-purple/10 px-3 py-2 text-sm font-medium text-tw-purple">
                <AbsenceIcon kind={absence.kind} className="size-4" />
                Absence
            </div>
            <ul className="flex flex-col border-t">
                <li className={cn(contentGrid, "px-3 py-2 text-sm")}>
                    <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                        {span.label}
                    </span>
                    <span className="text-right whitespace-nowrap tabular-nums">
                        {formatDuration(span.minutes)}
                    </span>
                    <span className="min-w-0 truncate font-medium">
                        {absence.label}
                        {part ? ` · ${part}` : ""}
                    </span>
                    <span />
                </li>
            </ul>
        </div>
    );
}

function LoggedTime({
    day,
    fullDay,
    pending,
}: {
    day: TimesheetDay;
    fullDay: boolean;
    pending: ConstantTask[];
}) {
    return (
        <div
            className={
                fullDay
                    ? "overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                    : "overflow-hidden rounded-xl bg-card ring-1 ring-tw-slate"
            }
        >
            <div
                className={
                    fullDay
                        ? "flex items-center justify-between gap-3 px-3 py-2"
                        : "flex items-center justify-between gap-3 bg-tw-slate  px-3 py-2 text-white"
                }
            >
                <p className="flex items-center gap-2 text-sm font-medium">
                    <TeamworkLogo variant={fullDay ? "slate" : "white"} />
                    Teamwork
                </p>
                <p className="text-sm font-medium tabular-nums">
                    {formatDuration(day.loggedMinutes)}
                </p>
            </div>
            {day.logged.length > 0 && (
                <ul className="flex flex-col divide-y border-t">
                    {day.logged.map((entry) => {
                        const start = minutesFromClock(entry.time ?? "");
                        const end =
                            start === null ? null : start + entry.minutes;

                        return (
                            <li
                                key={entry.id}
                                className={cn(
                                    contentGrid,
                                    "items-baseline px-3 py-2 text-sm",
                                )}
                            >
                                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                                    {timeRange(entry.time, entry.minutes)}
                                </span>
                                <span className="flex items-center justify-end gap-1.5 text-right whitespace-nowrap tabular-nums">
                                    {formatDuration(entry.minutes)}
                                    <span
                                        className={cn(
                                            "size-2 shrink-0 rounded-full",
                                            entry.billable
                                                ? "bg-tw-pink"
                                                : "bg-tw-indigo",
                                        )}
                                        role="img"
                                        aria-label={
                                            entry.billable
                                                ? "Billable"
                                                : "Non-billable"
                                        }
                                    />
                                </span>
                                <span className="min-w-0">
                                    <LoggedEntry entry={entry} />
                                    <OverlapNote
                                        message={overlapMessage(
                                            day.absence,
                                            start,
                                            end,
                                        )}
                                    />
                                </span>
                                <EditLoggedTime day={day} entry={entry} />
                            </li>
                        );
                    })}
                </ul>
            )}
            {pending.length > 0 && (
                <ul className="flex flex-col divide-y border-t">
                    {pending.map((constant) => (
                        <li
                            key={constant.id}
                            className={cn(
                                contentGrid,
                                "bg-muted/40 px-3 py-2 text-sm",
                            )}
                        >
                            <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                                {constant.start}–{constant.end}
                            </span>
                            <span className="flex items-center justify-end gap-1.5 text-right whitespace-nowrap tabular-nums">
                                {formatDuration(
                                    minutesBetween(
                                        constant.start,
                                        constant.end,
                                    ) ?? 0,
                                )}
                                <span
                                    className={cn(
                                        "size-2 shrink-0 rounded-full",
                                        constant.billable
                                            ? "bg-tw-pink"
                                            : "bg-tw-indigo",
                                    )}
                                    role="img"
                                    aria-label={
                                        constant.billable
                                            ? "Billable"
                                            : "Non-billable"
                                    }
                                />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="font-medium">
                                    {constant.projectName}
                                </span>
                                <span className="text-muted-foreground">
                                    {" "}
                                    · {constant.taskName}
                                </span>
                                {!constant.billable && (
                                    <span className="text-muted-foreground">
                                        {" "}
                                        · Non-billable
                                    </span>
                                )}
                                <OverlapNote
                                    message={overlapMessage(
                                        day.absence,
                                        minutesFromClock(constant.start),
                                        minutesFromClock(constant.end),
                                    )}
                                />
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`Ignore ${constant.taskName} on ${day.label}`}
                                    onClick={() =>
                                        router.post(
                                            `/constants/${constant.id}/skips`,
                                            { date: day.date },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Ignore
                                </Button>
                                <ConstantLogButton
                                    constant={constant}
                                    date={day.date}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ConstantLogButton({
    constant,
    date,
}: {
    constant: ConstantTask;
    date: string;
}) {
    const form = useForm({ date });
    const minutes = minutesBetween(constant.start, constant.end);

    return (
        <div className="flex shrink-0 flex-col items-end gap-1">
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={form.processing}
                aria-label={`Log ${constant.taskName} on ${constant.projectName}`}
                onClick={() =>
                    form.post(`/constants/${constant.id}/log`, {
                        preserveScroll: true,
                    })
                }
            >
                {form.processing ? (
                    <Spinner data-icon="inline-start" />
                ) : (
                    <ClockIcon data-icon="inline-start" />
                )}
                Log {minutes !== null ? formatDuration(minutes) : "time"}
            </Button>
            {form.errors.date !== undefined && (
                <span className="max-w-48 text-right text-xs text-destructive">
                    {form.errors.date}
                </span>
            )}
        </div>
    );
}

function EditLoggedTime({
    day,
    entry,
}: {
    day: TimesheetDay;
    entry: TimesheetLog;
}) {
    const [open, setOpen] = useState(false);
    const startMinutes =
        entry.time === null ? null : minutesFromClock(entry.time);

    if (entry.projectId === null || entry.taskId === null) {
        return null;
    }

    return (
        <span className="self-center">
            <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Edit ${entry.task || entry.project}`}
                onClick={() => setOpen(true)}
            >
                <PencilIcon />
            </Button>
            <LogTimeDialog
                open={open}
                onOpenChange={setOpen}
                projectId={entry.projectId}
                projectName={entry.project || "Teamwork"}
                rowKey={`log-${entry.id}`}
                date={day.date}
                dateLabel={day.label}
                start={entry.time}
                end={
                    startMinutes === null
                        ? null
                        : clockFromMinutes(startMinutes + entry.minutes)
                }
                minutes={entry.minutes}
                logged={day.logged}
                editing={{
                    id: entry.id,
                    taskId: entry.taskId,
                    taskName: entry.task,
                    billable: entry.billable,
                }}
            />
        </span>
    );
}

function LoggedEntry({ entry }: { entry: TimesheetLog }) {
    const project =
        entry.projectUrl === null ? (
            entry.project
        ) : (
            <a
                href={entry.projectUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
            >
                {entry.project || "Project"}
            </a>
        );

    return (
        <span className="min-w-0">
            <span className="font-medium">{project}</span>
            {entry.task !== "" &&
                (entry.taskUrl === null ? (
                    <span className="text-muted-foreground">
                        {" "}
                        · {entry.task}
                    </span>
                ) : (
                    <a
                        href={entry.taskUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground underline-offset-4 hover:underline"
                    >
                        {" "}
                        · {entry.task}
                    </a>
                ))}
            {entry.description !== "" && (
                <span className="block text-muted-foreground">
                    {entry.description}
                </span>
            )}
        </span>
    );
}

function TeamworkLink({
    rowKey,
    label,
    date,
    dateLabel,
    start,
    end,
    minutes,
    commits,
    logged,
    repositoryId,
    projectId,
    projectName,
    projects,
    canLink,
}: {
    rowKey: string;
    label: string;
    date: string;
    dateLabel: string;
    start: string | null;
    end: string | null;
    minutes: number;
    commits: TimesheetCommit[];
    logged: TimesheetLog[];
    repositoryId: number | null;
    projectId: number | null;
    projectName: string | null;
    projects: TeamworkProject[];
    canLink: boolean;
}) {
    const [open, setOpen] = useState(false);

    if (projectId === null || projectName === null) {
        return (
            <LinkProject
                repositoryId={repositoryId}
                repositoryName={label}
                projects={projects}
                canLink={canLink}
            />
        );
    }

    return (
        <div className="flex shrink-0 items-center gap-2 pr-2">
            <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Log ${label} on ${projectName}`}
                onClick={() => setOpen(true)}
            >
                <ClockIcon data-icon="inline-start" />
                Log
            </Button>
            <LogTimeDialog
                open={open}
                onOpenChange={setOpen}
                projectId={projectId}
                projectName={projectName}
                rowKey={rowKey}
                date={date}
                dateLabel={dateLabel}
                start={start}
                end={end}
                minutes={minutes}
                logged={logged}
            />
        </div>
    );
}

function LinkProject({
    repositoryId,
    repositoryName,
    projects,
    canLink,
}: {
    repositoryId: number | null;
    repositoryName: string;
    projects: TeamworkProject[];
    canLink: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const options = useMemo(
        () =>
            projects.map((project) => ({
                value: String(project.id),
                label: project.name,
            })),
        [projects],
    );
    const needle = query.trim().toLowerCase();
    const visible = options.filter((option) =>
        needle === "" ? true : option.label.toLowerCase().includes(needle),
    );

    if (!canLink || repositoryId === null) {
        return (
            <span className="shrink-0 pr-3 text-sm text-muted-foreground">
                Not linked
            </span>
        );
    }

    function link(projectId: string) {
        router.patch(
            `/repositories/${repositoryId}`,
            { teamwork_project_id: Number(projectId) },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            },
        );
    }

    return (
        <div className="shrink-0 pr-2">
            <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Link ${repositoryName} to Teamwork`}
                onClick={() => {
                    setQuery("");
                    setOpen(true);
                }}
            >
                <TeamworkLogo data-icon="inline-start" />
                Link
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Link {repositoryName}</DialogTitle>
                        <DialogDescription>
                            Choose the Teamwork project for this repository.
                        </DialogDescription>
                    </DialogHeader>
                    <Field>
                        <FieldLabel htmlFor={`link-project-${repositoryId}`}>
                            Teamwork project
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                id={`link-project-${repositoryId}`}
                                value={query}
                                placeholder="Search projects"
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                            />
                        </InputGroup>
                        <ScrollArea className="h-48 rounded-lg border">
                            {visible.length === 0 && (
                                <p className="px-3 py-2 text-muted-foreground">
                                    No projects match.
                                </p>
                            )}
                            <div className="flex flex-col p-1">
                                {visible.map((option) => (
                                    <Button
                                        key={option.value}
                                        type="button"
                                        variant="ghost"
                                        className="h-auto w-full justify-start px-2 py-1.5"
                                        onClick={() => link(option.value)}
                                    >
                                        <span className="truncate">
                                            {option.label}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </Field>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function absenceSpan(part: AbsencePart): {
    start: number;
    end: number;
    minutes: number;
    label: string;
} {
    if (part === "morning") {
        return {
            start: 9 * 60,
            end: 13 * 60,
            minutes: 4 * 60,
            label: "09:00–13:00",
        };
    }

    if (part === "afternoon") {
        return {
            start: 14 * 60,
            end: 18 * 60,
            minutes: 4 * 60,
            label: "14:00–18:00",
        };
    }

    return {
        start: 9 * 60,
        end: 18 * 60,
        minutes: 8 * 60,
        label: "09:00–18:00",
    };
}

function overlapMessage(
    absence: TimesheetDay["absence"],
    start: number | null,
    end: number | null,
): string | null {
    if (absence === null) {
        return null;
    }

    const span = absenceSpan(absence.part);
    const overlaps =
        start !== null && end !== null
            ? start < span.end && span.start < end
            : absence.part === "day";

    if (!overlaps) {
        return null;
    }

    const part = absencePartLabel(absence.part);

    return `Overlaps ${absence.label}${part ? ` · ${part}` : ""} (${span.label})`;
}

function OverlapNote({ message }: { message: string | null }) {
    if (message === null) {
        return null;
    }

    return <span className="block text-xs text-tw-purple">{message}</span>;
}

function absenceCovers(
    absence: TimesheetDay["absence"],
    constant: ConstantTask,
): boolean {
    if (absence === null) {
        return false;
    }

    if (absence.part === "day") {
        return true;
    }

    const start = minutesFromClock(constant.start);
    const end = minutesFromClock(constant.end);

    if (start === null || end === null) {
        return true;
    }

    const covered =
        absence.part === "morning" ? [9 * 60, 13 * 60] : [14 * 60, 18 * 60];

    return start < covered[1] && covered[0] < end;
}

function isoWeekday(date: string): number {
    const [year, month, day] = date.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();

    return weekday === 0 ? 7 : weekday;
}

function covers(entry: TimesheetLog, constant: ConstantTask): boolean {
    if (entry.taskId !== constant.taskId || entry.time === null) {
        return false;
    }

    const start = minutesFromClock(constant.start);
    const end = minutesFromClock(constant.end);
    const otherStart = minutesFromClock(entry.time);

    if (start === null || end === null || otherStart === null) {
        return false;
    }

    return start < otherStart + entry.minutes && otherStart < end;
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

function timeRange(start: string | null, minutes: number): string {
    if (start === null) {
        return "—";
    }

    const startMinutes = minutesFromClock(start);

    if (startMinutes === null) {
        return start;
    }

    return `${start.slice(0, 5)}–${clockFromMinutes(startMinutes + minutes)}`;
}

function clockFromMinutes(total: number): string {
    const minutes = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function minutesFromClock(clock: string): number | null {
    const match = /^(\d{2}):(\d{2})/.exec(clock);

    if (match === null) {
        return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
}

function projectFor(
    projects: TimesheetProject[],
    repository: string,
): TimesheetProject | undefined {
    return projects.find((project) => project.repository === repository);
}

function repositoryFor(
    repositories: RepositoryRecord[],
    path: string | undefined,
    name: string,
): RepositoryRecord | undefined {
    return (
        repositories.find((repository) => repository.path === path) ??
        repositories.find((repository) => repository.name === name)
    );
}

function BranchMark({ branches }: { branches: string[] }) {
    if (branches.length > 1) {
        return (
            <span
                className="flex shrink-0 items-center gap-1 text-muted-foreground"
                aria-label={`${branches.length} branches`}
            >
                <GitBranchIcon className="size-3.5" />
                <Badge variant="secondary">{branches.length}</Badge>
            </span>
        );
    }

    if (branches.length === 1) {
        return (
            <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                <GitBranchIcon className="size-3.5 shrink-0" />
                <span className="max-w-36 truncate">{branches[0]}</span>
            </span>
        );
    }

    return null;
}

function branchNames(commits: TimesheetCommit[]): string[] {
    return [
        ...new Set(
            commits
                .map((commit) => commit.branch)
                .filter((branch) => branch !== ""),
        ),
    ].sort((left, right) => left.localeCompare(right));
}

function CommitList({
    commits,
    showBranch,
}: {
    commits: TimesheetCommit[];
    showBranch: boolean;
}) {
    if (commits.length === 0) {
        return <p className="text-sm text-muted-foreground">No commits.</p>;
    }

    return (
        <ul className="flex flex-col gap-1.5">
            {commits.map((commit) => (
                <li key={commit.hash} className={cn(contentGrid, "text-sm")}>
                    <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                        {commit.time}
                    </span>
                    <span />
                    <span className="min-w-0 text-xs text-muted-foreground">
                        {commit.subject}
                    </span>
                    {showBranch && commit.branch !== "" && (
                        <span className="flex max-w-40 items-center gap-1 text-muted-foreground">
                            <GitBranchIcon className="size-3.5 shrink-0" />
                            <span className="truncate">{commit.branch}</span>
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );
}
