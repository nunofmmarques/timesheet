import { Head, router, usePage } from "@inertiajs/react";
import {
    CopyIcon,
    GitCommitHorizontalIcon,
    TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RepositorySheet } from "@/components/timesheet/repository-sheet";
import { SessionCard } from "@/components/timesheet/session-card";
import { SettingsSheet } from "@/components/timesheet/settings-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipProvider } from "@/components/ui/tooltip";
import { buildDrafts, formatDays, formatDuration } from "@/lib/timesheet";
import type { SessionDraft, TimesheetPageProps } from "@/types/timesheet";

const presets = [
    { value: "today", label: "Today" },
    { value: "week", label: "This week" },
    { value: "last-week", label: "Last week" },
    { value: "month", label: "This month" },
    { value: "last-month", label: "Previous month" },
];

export default function Timesheet({
    from,
    to,
    preset,
    days,
    problems,
    repositories,
    settings,
    discoverRoot,
    discoverRoots,
    commitCount,
}: TimesheetPageProps) {
    const page = usePage().props;
    const flash = page.flash as { status?: string | null } | undefined;
    const snapshot = JSON.stringify(days);
    const [stored, setStored] = useState(() => ({
        snapshot,
        drafts: buildDrafts(days),
    }));
    const toasted = useRef<string | null>(null);

    if (stored.snapshot !== snapshot) {
        setStored({ snapshot, drafts: buildDrafts(days) });
    }

    const drafts = stored.drafts;

    useEffect(() => {
        if (typeof flash?.status !== "string" || flash.status === "") {
            return;
        }

        if (toasted.current === flash.status) {
            return;
        }

        toasted.current = flash.status;
        toast.success(flash.status);
    }, [flash?.status]);

    const totals = useMemo(() => {
        let minutes = 0;
        let entries = 0;

        for (const day of days) {
            for (const session of day.sessions) {
                const draft = drafts[session.key];

                if (!draft?.included) {
                    continue;
                }

                minutes += draft.minutes;
                entries += 1;
            }
        }

        return { minutes, entries };
    }, [days, drafts]);

    function updateDraft(key: string, draft: SessionDraft) {
        setStored((current) => ({
            ...current,
            drafts: { ...current.drafts, [key]: draft },
        }));
    }

    function visit(query: Record<string, string>) {
        router.get("/", query, { preserveScroll: true });
    }

    async function copyAll() {
        const text = formatDays(days, drafts);

        if (text.trim() === "") {
            toast.error("Nothing is included for this interval.");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied the timesheet");
        } catch {
            toast.error("Could not copy the timesheet.");
        }
    }

    async function copyDay(label: string, date: string) {
        const text = formatDays(
            days.filter((day) => day.date === date),
            drafts,
        );

        if (text.trim() === "") {
            toast.error(`Nothing included on ${label}.`);
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            toast.success(`Copied ${label}`);
        } catch {
            toast.error("Could not copy that day.");
        }
    }

    return (
        <TooltipProvider>
            <Head title="Timesheet" />
            <Toaster />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex max-w-xl flex-col gap-1">
                        <h1 className="font-heading text-2xl font-medium tracking-tight">
                            Timesheet
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Git commits from your projects, grouped into work
                            intervals so you can edit the hours and paste them
                            into your timesheet.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <RepositorySheet
                            repositories={repositories}
                            discoverRoot={discoverRoot}
                            discoverRoots={discoverRoots}
                        />
                        <SettingsSheet settings={settings} />
                        <Button onClick={copyAll}>
                            <CopyIcon data-icon="inline-start" />
                            Copy all
                        </Button>
                    </div>
                </header>

                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <ToggleGroup
                        variant="outline"
                        size="sm"
                        spacing={0}
                        value={preset === "custom" ? [] : [preset]}
                        onValueChange={(value) => {
                            const next = value.at(-1);

                            if (next) {
                                visit({ preset: next });
                            }
                        }}
                    >
                        {presets.map((item) => (
                            <ToggleGroupItem
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <div className="w-auto flex flex-row items-center gap-3">
                        <Field orientation="horizontal" className="w-auto">
                            <FieldLabel htmlFor="from">From</FieldLabel>
                            <Input
                                id="from"
                                className="w-40"
                                type="date"
                                value={from}
                                onChange={(event) =>
                                    visit({
                                        preset: "custom",
                                        from: event.target.value,
                                        to,
                                    })
                                }
                            />
                        </Field>
                        <Field orientation="horizontal" className="w-auto">
                            <FieldLabel htmlFor="to">To</FieldLabel>
                            <Input
                                id="to"
                                className="w-40"
                                type="date"
                                value={to}
                                onChange={(event) =>
                                    visit({
                                        preset: "custom",
                                        from,
                                        to: event.target.value,
                                    })
                                }
                            />
                        </Field>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <Card size="sm">
                        <CardHeader>
                            <CardDescription>Hours to log</CardDescription>
                            <CardTitle>
                                {formatDuration(totals.minutes)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card size="sm">
                        <CardHeader>
                            <CardDescription>Entries</CardDescription>
                            <CardTitle>{totals.entries}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card size="sm">
                        <CardHeader>
                            <CardDescription>Commits</CardDescription>
                            <CardTitle>{commitCount}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {problems.length > 0 && (
                    <Alert>
                        <TriangleAlertIcon />
                        <AlertTitle>
                            Some repositories could not be read
                        </AlertTitle>
                        <AlertDescription>
                            {problems
                                .map(
                                    (problem) =>
                                        `${problem.repository}: ${problem.message}`,
                                )
                                .join(" ")}
                        </AlertDescription>
                    </Alert>
                )}

                {repositories.length === 0 && (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <GitCommitHorizontalIcon />
                            </EmptyMedia>
                            <EmptyTitle>No repositories yet</EmptyTitle>
                            <EmptyDescription>
                                Scan your Herd folder and this page will list
                                what you committed in the interval you pick.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                onClick={() =>
                                    router.post(
                                        "/repositories/scan",
                                        { directory: discoverRoot },
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Scan {discoverRoot}
                            </Button>
                        </EmptyContent>
                    </Empty>
                )}

                {repositories.length > 0 && days.length === 0 && (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <GitCommitHorizontalIcon />
                            </EmptyMedia>
                            <EmptyTitle>No commits in this interval</EmptyTitle>
                            <EmptyDescription>
                                {settings.authorEmail
                                    ? `Nothing from ${settings.authorEmail} between ${from} and ${to}.`
                                    : `Nothing between ${from} and ${to}.`}{" "}
                                Widen the dates, or clear the author filter in
                                Interval.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}

                <div className="flex flex-col gap-8">
                    {days.map((day) => (
                        <section key={day.date} className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col gap-0.5">
                                    <h2 className="font-heading text-base font-medium">
                                        {day.label}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDuration(
                                            day.sessions.reduce(
                                                (total, session) =>
                                                    drafts[session.key]
                                                        ?.included
                                                        ? total +
                                                          (drafts[session.key]
                                                              ?.minutes ?? 0)
                                                        : total,
                                                0,
                                            ),
                                        )}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyDay(day.label, day.date)}
                                >
                                    <CopyIcon data-icon="inline-start" />
                                    Copy day
                                </Button>
                            </div>
                            <div className="flex flex-col gap-3">
                                {day.sessions.map((session) => (
                                    <SessionCard
                                        key={`${session.key}:${session.minutes}:${session.description}:${session.included}`}
                                        dayLabel={day.label}
                                        session={session}
                                        onDraft={updateDraft}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>
        </TooltipProvider>
    );
}
