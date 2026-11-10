import { router } from '@inertiajs/react';
import { CopyIcon, RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    formatDuration,
    formatEntry,
    minutesToInput,
    parseHours,
} from '@/lib/timesheet';
import type { SessionDraft, TimesheetSession } from '@/types/timesheet';

export function SessionCard({
    dayLabel,
    session,
    onDraft,
}: {
    dayLabel: string;
    session: TimesheetSession;
    onDraft: (key: string, draft: SessionDraft) => void;
}) {
    const [description, setDescription] = useState(session.description);
    const [hours, setHours] = useState(() =>
        minutesToInput(session.minutes),
    );
    const [included, setIncluded] = useState(session.included);
    const minutes = parseHours(hours, session.minutes);
    const hoursId = `hours-${session.key.slice(0, 8)}`;
    const noteId = `note-${session.key.slice(0, 8)}`;
    const includeId = `include-${session.key.slice(0, 8)}`;

    function current(overrides: Partial<SessionDraft> = {}): SessionDraft {
        return {
            minutes,
            description,
            included,
            ...overrides,
        };
    }

    function save(next: SessionDraft) {
        onDraft(session.key, next);
        router.put(
            `/entries/${session.key}`,
            {
                minutes: next.minutes,
                description: next.description,
                included: next.included,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['settings'],
            },
        );
    }

    async function copyEntry() {
        const next = current();
        onDraft(session.key, next);

        try {
            await navigator.clipboard.writeText(
                formatEntry(dayLabel, session, next),
            );
            toast.success(`Copied ${session.repository}`);
        } catch {
            toast.error('Could not copy that entry.');
        }
    }

    return (
        <Card size="sm" className={included ? undefined : 'opacity-60'}>
            <CardHeader>
                <CardTitle>{session.repository}</CardTitle>
                <CardDescription>
                    {session.startedAt}–{session.endedAt} ·{' '}
                    {session.commits.length === 1
                        ? '1 commit'
                        : `${session.commits.length} commits`}
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={copyEntry}>
                        <CopyIcon data-icon="inline-start" />
                        Copy
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor={noteId}>Timesheet note</FieldLabel>
                        <Textarea
                            id={noteId}
                            rows={Math.min(
                                8,
                                Math.max(3, description.split('\n').length),
                            )}
                            value={description}
                            onChange={(event) => {
                                const nextDescription = event.target.value;
                                setDescription(nextDescription);
                                onDraft(
                                    session.key,
                                    current({ description: nextDescription }),
                                );
                            }}
                            onBlur={() => save(current())}
                        />
                        {description !== session.generatedDescription && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setDescription(
                                        session.generatedDescription,
                                    );
                                    save(
                                        current({
                                            description:
                                                session.generatedDescription,
                                        }),
                                    );
                                }}
                            >
                                <RotateCcwIcon data-icon="inline-start" />
                                Use commit messages
                            </Button>
                        )}
                    </Field>
                    <Collapsible>
                        <CollapsibleTrigger
                            render={<Button variant="ghost" size="sm" />}
                        >
                            Show commits
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <ul className="flex flex-col gap-1 pt-2">
                                {session.commits.map((commit) => (
                                    <li
                                        key={commit.hash}
                                        className="flex min-w-0 items-baseline gap-2 text-sm"
                                    >
                                        <span className="font-mono text-muted-foreground">
                                            {commit.shortHash}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {commit.time}
                                        </span>
                                        <span className="truncate">
                                            {commit.subject}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CollapsibleContent>
                    </Collapsible>
                </FieldGroup>
            </CardContent>
            <CardFooter className="justify-between gap-3">
                <Field orientation="horizontal" className="w-auto">
                    <Checkbox
                        id={includeId}
                        checked={included}
                        onCheckedChange={(checked) => {
                            const nextIncluded = checked === true;
                            setIncluded(nextIncluded);
                            save(current({ included: nextIncluded }));
                        }}
                    />
                    <FieldLabel htmlFor={includeId}>Include</FieldLabel>
                </Field>
                <Field className="w-28">
                    <FieldLabel htmlFor={hoursId}>Hours</FieldLabel>
                    <Input
                        id={hoursId}
                        type="number"
                        min={0}
                        step={0.25}
                        inputMode="decimal"
                        value={hours}
                        onChange={(event) => {
                            const nextHours = event.target.value;
                            setHours(nextHours);
                            onDraft(
                                session.key,
                                current({
                                    minutes: parseHours(
                                        nextHours,
                                        session.minutes,
                                    ),
                                }),
                            );
                        }}
                        onBlur={() => {
                            const next = current();
                            setHours(minutesToInput(next.minutes));
                            save(next);
                        }}
                    />
                    <FieldDescription>
                        Estimated {formatDuration(session.estimatedMinutes)}
                    </FieldDescription>
                </Field>
            </CardFooter>
        </Card>
    );
}
