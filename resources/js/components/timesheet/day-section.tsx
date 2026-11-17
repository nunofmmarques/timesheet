import { router, useForm } from "@inertiajs/react";
import {
    CheckIcon,
    ChevronDownIcon,
    ClockIcon,
    EllipsisIcon,
    FlagIcon,
    TriangleAlertIcon,
    GitBranchIcon,
    GitCommitHorizontalIcon,
    ListTodoIcon,
    PencilIcon,
    RepeatIcon,
    SearchIcon,
    StickyNoteIcon,
    TreePalmIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
    AbsenceIcon,
    absencePartLabel,
} from "@/components/timesheet/absence-kind";
import { LogTimeDialog } from "@/components/timesheet/log-time-dialog";
import { NoteForm } from "@/components/timesheet/notes-sheet";
import {
    ConfirmDeleteButton,
    SheetItemActions,
} from "@/components/timesheet/sheet-actions";
import { TimeOffForm } from "@/components/timesheet/time-off-sheet";
import { TeamworkLogo } from "@/components/timesheet/teamwork-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    DialogFooter,
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
import type { ConstantTask } from "@/types/constant-task";
import type { DayNote } from "@/types/day-note";
import type { Holiday } from "@/types/holiday";
import type { RepositoryRecord } from "@/types/repository";
import type { TeamworkProject, TimesheetLog } from "@/types/teamwork";
import type { AbsencePart, TimeOff } from "@/types/time-off";
import type {
    TimesheetCommit,
    TimesheetDay,
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
    holidays,
}: {
    day: TimesheetDay;
    repositories: RepositoryRecord[];
    projects: TeamworkProject[];
    teamworkConfigured: boolean;
    teamworkError: string | null;
    constants: ConstantTask[];
    absences: TimeOff[];
    holidays: Holiday[];
}) {
    const fullDay =
        day.capacityMinutes > 0 && day.loggedMinutes >= day.capacityMinutes;
    const overLogged =
        day.capacityMinutes > 0 && day.loggedMinutes > day.capacityMinutes;
    const suggestLogs = !fullDay;
    const rows =
        suggestLogs && day.blocks.length > 0
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
                      meta: null as string | null,
                      start: null as string | null,
                      end: null as string | null,
                      minutes: project.minutes,
                      commits: project.commits,
                      branches: branchNames(project.commits),
                      repositoryId: repository?.id ?? null,
                      teamworkProjectId: repository?.teamworkProjectId ?? null,
                      teamworkProjectName:
                          repository?.teamworkProjectName ?? null,
                  };
              });
    const lunchOverlap = day.logged.some((entry) => overlapsLunch(entry));
    const today = day.date === todayInLisbon();
    const holiday = holidays.find((item) => item.date === day.date) ?? null;
    const absenceRecord =
        day.absence == null
            ? null
            : (absences.find((item) => item.id === day.absence?.id) ?? null);
    const [timeOffOpen, setTimeOffOpen] = useState<"add" | "edit" | null>(null);
    const [noteEditor, setNoteEditor] = useState<DayNote | "new" | null>(null);
    const [reveal, setReveal] = useState(0);
    const [gitOpen, setGitOpen] = useState(!fullDay);
    const [rowOpen, setRowOpen] = useState<Record<string, boolean>>({});
    const pending = constants.filter(
        (constant) =>
            constant.weekday === isoWeekday(day.date) &&
            !constant.skippedDates.includes(day.date) &&
            !day.logged.some((entry) => covers(entry, constant)) &&
            !absenceCovers(day.absence, constant),
    );

    useEffect(() => {
        function onReveal(event: Event) {
            if (!(event instanceof CustomEvent) || event.detail !== day.date) {
                return;
            }

            setReveal((value) => value + 1);
        }

        window.addEventListener("timesheet:reveal-day", onReveal);

        return () =>
            window.removeEventListener("timesheet:reveal-day", onReveal);
    }, [day.date]);

    useEffect(() => {
        if (reveal === 0) {
            return;
        }

        setGitOpen(true);
        setRowOpen((current) => {
            const next = { ...current };

            for (const row of rows) {
                next[row.key] = true;
            }

            return next;
        });
    }, [reveal]);

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
                            !today && holiday !== null && "text-tw-violet",
                        )}
                    >
                        {day.label}
                    </h2>
                    {today && (
                        <Badge className="bg-tw-orange text-white">Today</Badge>
                    )}
                    {holiday !== null && (
                        <Badge className="bg-tw-violet text-white">
                            <FlagIcon data-icon="inline-start" />
                            {holiday.name}
                        </Badge>
                    )}
                    {fullDay && !overLogged && (
                        <Badge className="bg-green-600 text-white">
                            <CheckIcon data-icon="inline-start" />
                            {formatDuration(day.capacityMinutes)} logged
                        </Badge>
                    )}
                    {overLogged && (
                        <Badge className="bg-red-600 text-white">
                            {formatDuration(day.loggedMinutes)} logged
                        </Badge>
                    )}
                    {lunchOverlap && (
                        <Badge className="bg-amber-500 text-white">
                            <TriangleAlertIcon data-icon="inline-start" />
                            13:00–14:00
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
                        <DropdownMenuItem onClick={() => setTimeOffOpen("add")}>
                            <TreePalmIcon />
                            Add time off
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setNoteEditor("new")}>
                            <StickyNoteIcon />
                            Add note
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
                        <DialogTitle>Add time off</DialogTitle>
                        <DialogDescription>{day.label}</DialogDescription>
                    </DialogHeader>
                    {timeOffOpen !== null && (
                        <TimeOffForm
                            key={`${timeOffOpen}-${absenceRecord?.id ?? day.date}`}
                            absence={null}
                            initialDate={day.date}
                            onDone={() => setTimeOffOpen(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={noteEditor !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setNoteEditor(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {noteEditor !== null && noteEditor !== "new"
                                ? "Edit note"
                                : "Add note"}
                        </DialogTitle>
                        <DialogDescription>{day.label}</DialogDescription>
                    </DialogHeader>
                    {noteEditor !== null && (
                        <NoteForm
                            key={
                                noteEditor === "new"
                                    ? "new"
                                    : String(noteEditor.id)
                            }
                            note={noteEditor === "new" ? null : noteEditor}
                            initialDate={day.date}
                            variant="dialog"
                            onDone={() => setNoteEditor(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
                {day.absence != null && (
                    <AbsenceTime
                        absence={day.absence}
                        record={absenceRecord}
                        dateLabel={day.label}
                    />
                )}

                {day.notes.length > 0 && (
                    <DayNotes
                        notes={day.notes}
                        onEdit={(note) => setNoteEditor(note)}
                    />
                )}

                {suggestLogs && pending.length > 0 && (
                    <ConstantTime day={day} pending={pending} />
                )}

                <LoggedTime
                    day={day}
                    projects={projects}
                    canLog={teamworkConfigured && teamworkError === null}
                    reveal={reveal}
                />

                {rows.length > 0 && (
                    <Collapsible
                        open={gitOpen}
                        onOpenChange={setGitOpen}
                        className="overflow-hidden bg-muted/50 ring-1 ring-foreground/10"
                    >
                        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium">
                            <GitCommitHorizontalIcon className="size-4" />
                            Git
                            <ChevronDownIcon className="ml-auto size-4 transition-transform in-aria-expanded:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="flex flex-col divide-y border-t bg-card">
                                {rows.map((row) => (
                                    <Collapsible
                                        key={row.key}
                                        open={rowOpen[row.key] ?? false}
                                        onOpenChange={(open) =>
                                            setRowOpen((current) => ({
                                                ...current,
                                                [row.key]: open,
                                            }))
                                        }
                                    >
                                        <div className="flex items-center gap-2">
                                            <CollapsibleTrigger
                                                render={
                                                    <Button
                                                        variant="ghost"
                                                        className="grid h-auto min-w-0 flex-1 grid-cols-[7.5rem_9rem_minmax(0,1fr)] items-center justify-start gap-3 rounded-none border-0 py-2 pr-2 pl-3 text-left font-normal whitespace-normal"
                                                    />
                                                }
                                            >
                                                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                                                    {suggestLogs
                                                        ? row.meta
                                                        : null}
                                                </span>
                                                <span className="text-right whitespace-nowrap tabular-nums">
                                                    {suggestLogs &&
                                                        row.minutes > 0 && (
                                                            <>
                                                                <span className=" text-xs text-muted-foreground">
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
                                            </CollapsibleTrigger>
                                            {suggestLogs ? (
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
                                                    repositoryId={
                                                        row.repositoryId
                                                    }
                                                    projectId={
                                                        row.teamworkProjectId
                                                    }
                                                    projectName={
                                                        row.teamworkProjectName
                                                    }
                                                    projects={projects}
                                                    canLink={
                                                        teamworkConfigured &&
                                                        teamworkError === null
                                                    }
                                                />
                                            ) : (
                                                row.teamworkProjectId ===
                                                    null && (
                                                    <LinkProject
                                                        repositoryId={
                                                            row.repositoryId
                                                        }
                                                        repositoryName={
                                                            row.label
                                                        }
                                                        projects={projects}
                                                        canLink={
                                                            teamworkConfigured &&
                                                            teamworkError ===
                                                                null
                                                        }
                                                    />
                                                )
                                            )}
                                            <CollapsibleTrigger
                                                aria-label={`Toggle ${row.label}`}
                                                className="mr-3 shrink-0 cursor-pointer"
                                            >
                                                <ChevronDownIcon className="size-4 transition-transform in-aria-expanded:rotate-180" />
                                            </CollapsibleTrigger>
                                        </div>
                                        <CollapsibleContent className="bg-muted/40 px-3 py-2">
                                            <CommitList
                                                commits={row.commits}
                                                showBranch={
                                                    row.branches.length > 1
                                                }
                                            />
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}
            </div>
        </section>
    );
}

function DayNotes({
    notes,
    onEdit,
}: {
    notes: DayNote[];
    onEdit: (note: DayNote) => void;
}) {
    const [open, setOpen] = useState(true);

    return (
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className="overflow-hidden bg-muted/50 ring-1 ring-foreground/10"
        >
            <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium">
                <StickyNoteIcon className="size-4" />
                Notes
                <ChevronDownIcon className="ml-auto size-4 transition-transform in-aria-expanded:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <ul className="flex flex-col divide-y border-t bg-card">
                    {notes.map((note) => (
                        <li
                            key={note.id}
                            className={cn(contentGrid, "px-3 py-2 text-sm")}
                        >
                            <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                                {note.time}
                            </span>
                            <span className="flex items-center justify-end">
                                <StickyNoteIcon className="size-3 text-muted-foreground" />
                            </span>
                            <span className="min-w-0 whitespace-pre-wrap font-medium">
                                {note.body}
                            </span>
                            <SheetItemActions>
                                <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label="Edit note"
                                    onClick={() => onEdit(note)}
                                >
                                    <PencilIcon />
                                </Button>
                                <ConfirmDeleteButton
                                    label="Remove note"
                                    onConfirm={() =>
                                        router.delete(`/notes/${note.id}`, {
                                            preserveScroll: true,
                                        })
                                    }
                                />
                            </SheetItemActions>
                        </li>
                    ))}
                </ul>
            </CollapsibleContent>
        </Collapsible>
    );
}

function AbsenceTime({
    absence,
    record,
    dateLabel,
}: {
    absence: NonNullable<TimesheetDay["absence"]>;
    record: TimeOff | null;
    dateLabel: string;
}) {
    const span = absenceSpan(absence.part);
    const part = absencePartLabel(absence.part);
    const [editing, setEditing] = useState(false);

    return (
        <div>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 text-sm font-medium ring-1 ring-foreground/10">
                <AbsenceIcon kind={"vacation"} className="size-4" />
                Absence
            </div>
            <ul className="flex flex-col border-t">
                <li className={cn(contentGrid, "px-3 py-2 text-sm")}>
                    <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                        {span.label}
                    </span>
                    <span className="flex items-center justify-end gap-1.5 text-right whitespace-nowrap tabular-nums">
                        {formatDuration(span.minutes)}
                        <AbsenceIcon kind={absence.kind} className="size-3" />
                    </span>
                    <span className="min-w-0 truncate font-medium">
                        {absence.label}
                        <span className="font-normal text-muted-foreground">
                            {part ? ` · ${part}` : ""}
                        </span>
                    </span>
                    {record !== null && (
                        <span className="self-center">
                            <Button
                                type="button"
                                size="icon-xs"
                                variant="ghost"
                                aria-label={`Edit ${absence.label}`}
                                onClick={() => setEditing(true)}
                            >
                                <PencilIcon />
                            </Button>
                        </span>
                    )}
                </li>
            </ul>
            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit time off</DialogTitle>
                        <DialogDescription>{dateLabel}</DialogDescription>
                    </DialogHeader>
                    {editing && record !== null && (
                        <TimeOffForm
                            key={record.id}
                            absence={record}
                            onDone={() => setEditing(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ConstantTime({
    day,
    pending,
}: {
    day: TimesheetDay;
    pending: ConstantTask[];
}) {
    return (
        <div>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 text-sm font-medium ring-1 ring-foreground/10">
                <RepeatIcon className="size-4" />
                Constants
            </div>
            <ul className="flex flex-col divide-y border-t">
                {pending.map((constant) => (
                    <li
                        key={constant.id}
                        className={cn(contentGrid, "px-3 py-2 text-sm")}
                    >
                        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                            {constant.start}–{constant.end}
                        </span>
                        <span className="flex items-center justify-end gap-1.5 text-right whitespace-nowrap tabular-nums">
                            {formatDuration(
                                minutesBetween(constant.start, constant.end) ??
                                    0,
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
                        <span className="min-w-0">
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
        </div>
    );
}

function LoggedTime({
    day,
    projects,
    canLog,
    reveal,
}: {
    day: TimesheetDay;
    projects: TeamworkProject[];
    canLog: boolean;
    reveal: number;
}) {
    const fullDay =
        day.capacityMinutes > 0 && day.loggedMinutes >= day.capacityMinutes;
    const hasTime = day.loggedMinutes > 0;
    const warned =
        (day.capacityMinutes > 0 && day.loggedMinutes > day.capacityMinutes) ||
        day.logged.some((entry) => overlapsLunch(entry));
    const [logging, setLogging] = useState(false);
    const [open, setOpen] = useState(!fullDay || warned);

    useEffect(() => {
        if (reveal > 0) {
            setOpen(true);
        }
    }, [reveal]);

    return (
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className="overflow-hidden bg-muted/50 ring-1 ring-foreground/10"
        >
            <div className="flex items-center gap-2 px-3 py-2">
                <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm font-medium">
                    <TeamworkLogo variant="transparent" />
                    <span className="text-tw-slate">Teamwork</span>
                    {!fullDay && hasTime && (
                        <span className="tabular-nums text-muted-foreground">
                            {formatDuration(day.loggedMinutes)}
                        </span>
                    )}
                </CollapsibleTrigger>
                {canLog && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Log time on ${day.label}`}
                        onClick={() => setLogging(true)}
                    >
                        <ClockIcon data-icon="inline-start" />
                        Log
                    </Button>
                )}
                <CollapsibleTrigger
                    aria-label={`Toggle Teamwork on ${day.label}`}
                    className="shrink-0 cursor-pointer"
                >
                    <ChevronDownIcon className="size-4 transition-transform in-aria-expanded:rotate-180" />
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
                {day.logged.length > 0 ? (
                    <ul className="flex flex-col divide-y border-t bg-card">
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
                ) : (
                    <p className="border-t bg-card px-3 py-2 text-sm text-muted-foreground">
                        No time logged
                    </p>
                )}
            </CollapsibleContent>
            {canLog && (
                <LogTimeDialog
                    open={logging}
                    onOpenChange={setLogging}
                    projectId={null}
                    projects={projects}
                    projectName=""
                    rowKey={`day-${day.date}`}
                    date={day.date}
                    dateLabel={day.label}
                    start={null}
                    end={null}
                    minutes={0}
                    logged={day.logged}
                />
            )}
        </Collapsible>
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
                size="icon-xs"
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
        <div className="flex shrink-0 items-center gap-2">
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
    const [selected, setSelected] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [tasks, setTasks] = useState<ProjectTask[] | null>(null);
    const [tasksError, setTasksError] = useState<string | null>(null);
    const options = useMemo(
        () =>
            projects
                .filter((project) => project.enabled)
                .map((project) => ({
                    value: String(project.id),
                    label: project.name,
                })),
        [projects],
    );
    const needle = query.trim().toLowerCase();
    const visible = options.filter((option) =>
        needle === "" ? true : option.label.toLowerCase().includes(needle),
    );
    const selectedProject =
        options.find((option) => option.value === selected) ?? null;

    useEffect(() => {
        if (!open || selected === null) {
            return;
        }

        setTasks(null);
        setTasksError(null);

        const controller = new AbortController();

        fetch(`/teamwork/projects/${selected}/tasks`, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
        })
            .then(async (response) => {
                const body = (await response.json()) as {
                    tasks?: ProjectTask[];
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

                setTasksError("Teamwork tasks could not be loaded.");
            });

        return () => controller.abort();
    }, [open, selected]);

    if (!canLink || repositoryId === null) {
        return (
            <span className="shrink-0 text-sm text-muted-foreground">
                Not linked
            </span>
        );
    }

    function close() {
        setOpen(false);
        setQuery("");
        setSelected(null);
        setTasks(null);
        setTasksError(null);
    }

    function save() {
        if (selected === null || saving) {
            return;
        }

        setSaving(true);
        router.patch(
            `/repositories/${repositoryId}`,
            { teamwork_project_id: Number(selected) },
            {
                preserveScroll: true,
                onSuccess: () => close(),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div className="shrink-0">
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
            <Dialog
                open={open}
                onOpenChange={(next) => {
                    if (next) {
                        setOpen(true);
                        return;
                    }

                    close();
                }}
            >
                <DialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TeamworkLogo variant="slate" />
                            Link{" "}
                            <Badge variant="secondary">
                                <GitCommitHorizontalIcon className="size-4" />
                                {repositoryName}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Choose the Teamwork project for this repository.
                        </DialogDescription>
                    </DialogHeader>
                    <Field>
                        <FieldLabel htmlFor={`link-project-${repositoryId}`}>
                            Teamwork project
                        </FieldLabel>
                        <InputGroup className="!rounded-b-none border-b-0 -mb-2">
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
                        <ScrollArea className="h-48 rounded-b-lg border">
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
                                        variant={
                                            selected === option.value
                                                ? "secondary"
                                                : "ghost"
                                        }
                                        className="h-auto w-full justify-start px-2 py-1.5"
                                        aria-pressed={selected === option.value}
                                        onClick={() =>
                                            setSelected(option.value)
                                        }
                                    >
                                        <span className="truncate">
                                            {option.label}
                                        </span>
                                        {selected === option.value && (
                                            <CheckIcon className="ml-auto" />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                        {selectedProject !== null && (
                            <Alert>
                                <CheckIcon />
                                <AlertTitle>Selected</AlertTitle>
                                <AlertDescription>
                                    {selectedProject.label}
                                </AlertDescription>
                            </Alert>
                        )}
                    </Field>
                    {selectedProject !== null && (
                        <Field>
                            <FieldLabel className="items-center">
                                <ListTodoIcon className="size-3.5" />
                                Tasks
                            </FieldLabel>
                            <ScrollArea className="h-40 rounded-lg border">
                                {tasks === null && tasksError === null && (
                                    <p className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                                        <Spinner />
                                        Loading tasks
                                    </p>
                                )}
                                {tasksError !== null && (
                                    <p className="px-3 py-2 text-muted-foreground">
                                        {tasksError}
                                    </p>
                                )}
                                {tasks !== null && tasks.length === 0 && (
                                    <p className="px-3 py-2 text-muted-foreground">
                                        This project has no tasks.
                                    </p>
                                )}
                                <ul className="flex flex-col p-1">
                                    {(tasks ?? []).map((task) => (
                                        <li
                                            key={task.id}
                                            className="flex items-start gap-2 px-2 py-1.5"
                                        >
                                            <ListTodoIcon className="mt-0.5 size-3.5 shrink-0" />
                                            <span className="min-w-0">
                                                <span className="block truncate">
                                                    {taskPath(task)}
                                                </span>
                                                {task.tasklist !== "" && (
                                                    <span className="block truncate text-muted-foreground">
                                                        {task.tasklist}
                                                    </span>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </Field>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={selected === null || saving}
                            onClick={save}
                        >
                            {saving && <Spinner data-icon="inline-start" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

type ProjectTask = {
    id: number;
    name: string;
    tasklist: string;
    ancestors: string[];
};

function taskPath(task: ProjectTask): string {
    return [...task.ancestors, task.name].join(" / ");
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
    if (absence == null) {
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
    if (absence == null) {
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

function overlapsLunch(entry: TimesheetLog): boolean {
    if (entry.time === null) {
        return false;
    }

    const start = minutesFromClock(entry.time);

    if (start === null) {
        return false;
    }

    return start < 14 * 60 && 13 * 60 < start + entry.minutes;
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
                        <span className="flex max-w-40 items-center gap-1 text-muted-foreground/60 text-xs">
                            <GitBranchIcon className="size-3.5 shrink-0" />
                            <span className="truncate">{commit.branch}</span>
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );
}
