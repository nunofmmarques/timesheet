import { ChevronDownIcon, GitCommitHorizontalIcon } from "lucide-react";
import teamworkLogo from "@/assets/teamwork.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDuration } from "@/lib/timesheet";
import type {
    TimesheetCommit,
    TimesheetDay,
    TimesheetLog,
    TimesheetProject,
} from "@/types/timesheet";

export function DaySection({ day }: { day: TimesheetDay }) {
    const rows =
        day.blocks.length > 0
            ? day.blocks.map((block) => {
                  const project = projectFor(day.projects, block.repository);

                  return {
                      key: `${block.repository}-${block.start}`,
                      label: block.repository,
                      meta: `${block.start}–${block.end}`,
                      minutes: block.minutes,
                      commits: project?.commits ?? [],
                  };
              })
            : day.projects.map((project) => ({
                  key: project.repositoryPath,
                  label: project.repository,
                  meta: null,
                  minutes: project.minutes,
                  commits: project.commits,
              }));

    const fullDay = day.loggedMinutes >= 8 * 60;

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="font-heading text-base font-medium">
                        {day.label}
                    </h2>
                    {fullDay && (
                        <Badge className="bg-teamwork text-white">
                            8h logged
                        </Badge>
                    )}
                </div>
            </div>

            <LoggedTime day={day} fullDay={fullDay} />

            {rows.length > 0 && (
                <div className="overflow-hidden rounded-xl bg-muted/50 ring-1 ring-foreground/10">
                    <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                        <GitCommitHorizontalIcon className="size-4" />
                        Git
                    </div>
                    <div className="flex flex-col divide-y border-t bg-card">
                        {rows.map((row) => (
                            <Collapsible key={row.key}>
                                <CollapsibleTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            className="h-auto w-full justify-between rounded-none px-3 py-2 font-normal"
                                        />
                                    }
                                >
                                    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        {row.meta !== null && (
                                            <span className="w-28 shrink-0 text-muted-foreground tabular-nums">
                                                {row.meta}
                                            </span>
                                        )}
                                        <span className="min-w-0 flex-1 truncate font-medium">
                                            {row.label}
                                        </span>
                                        {row.minutes > 0 && (
                                            <span className="shrink-0 tabular-nums">
                                                <span className="text-muted-foreground">
                                                    to log{" "}
                                                </span>
                                                {formatDuration(row.minutes)}
                                            </span>
                                        )}
                                    </span>
                                    <ChevronDownIcon
                                        data-icon="inline-end"
                                        className="transition-transform in-aria-expanded:rotate-180"
                                    />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="bg-muted/40 px-3 py-2">
                                    <CommitList commits={row.commits} />
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function LoggedTime({ day, fullDay }: { day: TimesheetDay; fullDay: boolean }) {
    return (
        <div
            className={
                fullDay
                    ? "overflow-hidden rounded-xl bg-card ring-1 ring-teamwork"
                    : "overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
            }
        >
            <div
                className={
                    fullDay
                        ? "flex items-center justify-between gap-3 bg-teamwork px-3 py-2 text-white"
                        : "flex items-center justify-between gap-3 px-3 py-2"
                }
            >
                <p className="flex items-center gap-2 text-sm font-medium">
                    <img src={teamworkLogo} alt="" className="size-4" />
                    Teamwork
                </p>
                <p className="text-sm font-medium tabular-nums">
                    {formatDuration(day.loggedMinutes)}
                </p>
            </div>
            {day.logged.length > 0 && (
                <ul className="flex flex-col divide-y border-t">
                    {day.logged.map((entry) => (
                        <li
                            key={entry.id}
                            className="flex items-baseline gap-3 px-3 py-2 text-sm"
                        >
                            <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
                                {entry.time ?? "—"}
                            </span>
                            <span className="w-16 shrink-0 tabular-nums">
                                {formatDuration(entry.minutes)}
                            </span>
                            <LoggedEntry entry={entry} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
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
        <span className="min-w-0 flex-1">
            <span className="font-medium">{project}</span>
            {entry.task !== "" && (
                <span className="text-muted-foreground"> · {entry.task}</span>
            )}
            {entry.description !== "" && (
                <span className="block text-muted-foreground">
                    {entry.description}
                </span>
            )}
        </span>
    );
}

function projectFor(
    projects: TimesheetProject[],
    repository: string,
): TimesheetProject | undefined {
    return projects.find((project) => project.repository === repository);
}

function CommitList({ commits }: { commits: TimesheetCommit[] }) {
    if (commits.length === 0) {
        return <p className="text-sm text-muted-foreground">No commits.</p>;
    }

    return (
        <ul className="flex flex-col gap-1.5">
            {commits.map((commit) => (
                <li key={commit.hash} className="flex gap-3 text-sm">
                    <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
                        {commit.time}
                    </span>
                    <span className="min-w-0">{commit.subject}</span>
                </li>
            ))}
        </ul>
    );
}
