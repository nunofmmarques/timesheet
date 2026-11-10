import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatDuration } from '@/lib/timesheet';
import type {
    TimesheetCommit,
    TimesheetDay,
    TimesheetProject,
} from '@/types/timesheet';

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
                      spentMinutes: project?.spentMinutes ?? 0,
                      commits: project?.commits ?? [],
                  };
              })
            : day.projects.map((project) => ({
                  key: project.repositoryPath,
                  label: project.repository,
                  meta: null,
                  minutes: project.minutes,
                  spentMinutes: project.spentMinutes,
                  commits: project.commits,
              }));

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-heading text-base font-medium">
                    {day.label}
                </h2>
                <p className="text-sm text-muted-foreground tabular-nums">
                    {day.capacityMinutes > 0
                        ? formatDuration(day.capacityMinutes)
                        : 'No scheduled hours'}
                </p>
            </div>

            {rows.length > 0 && (
                <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                    <div className="flex flex-col divide-y">
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
                                        <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
                                            {row.minutes > 0 && (
                                                <span>
                                                    <span className="text-muted-foreground">
                                                        to log{' '}
                                                    </span>
                                                    {formatDuration(
                                                        row.minutes,
                                                    )}
                                                </span>
                                            )}
                                            <span>
                                                <span className="text-muted-foreground">
                                                    spent{' '}
                                                </span>
                                                {formatDuration(
                                                    row.spentMinutes,
                                                )}
                                            </span>
                                        </span>
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
