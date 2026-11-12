import { Head, router, usePage } from "@inertiajs/react";
import { GitCommitHorizontalIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { DaySection } from "@/components/timesheet/day-section";
import { LoggedChart } from "@/components/timesheet/logged-chart";
import { RangePicker } from "@/components/timesheet/range-picker";
import { RepositorySheet } from "@/components/timesheet/repository-sheet";
import { ConstantsSheet } from "@/components/timesheet/constants-sheet";
import { TimeOffSheet } from "@/components/timesheet/time-off-sheet";
import { SettingsSheet } from "@/components/timesheet/settings-sheet";
import { TeamworkSheet } from "@/components/timesheet/teamwork-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { Toaster } from "@/components/ui/sonner";
import type { TimesheetPageProps } from "@/types/timesheet";

export default function Timesheet({
    from,
    to,
    preset,
    days,
    problems,
    repositories,
    teamworkProjects,
    teamworkError,
    teamworkTimeError,
    teamworkConfigured,
    absences,
    constants,
    settings,
    discoverRoots,
}: TimesheetPageProps) {
    const page = usePage().props;
    const flash = page.flash as { status?: string | null } | undefined;
    const toasted = useRef<string | null>(null);

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

    function visit(query: Record<string, string>) {
        router.get("/", query, { preserveScroll: true });
    }

    return (
        <>
            <Head title="Timesheet" />
            <Toaster />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
                <header className="flex flex-col gap-4">
                    <div className="flex max-w-xl flex-col gap-1">
                        <h1 className="font-heading text-2xl font-medium tracking-tight">
                            Timesheet
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Projects and commits for each day, with the working
                            day split across them. Monday to Thursday is
                            9:00–13:00 and 14:00–18:00. Friday is 9:00–13:00.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <RangePicker
                            from={from}
                            to={to}
                            preset={preset}
                            onChange={visit}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <RepositorySheet
                                repositories={repositories}
                                discoverRoots={discoverRoots}
                            />
                            <TeamworkSheet
                                repositories={repositories}
                                projects={teamworkProjects}
                                discoverRoots={discoverRoots}
                                configured={teamworkConfigured}
                                error={teamworkError}
                            />
                            <ConstantsSheet
                                constants={constants}
                                projects={teamworkProjects}
                                configured={teamworkConfigured}
                                error={teamworkError}
                            />
                            <TimeOffSheet absences={absences} />
                            <SettingsSheet settings={settings} />
                        </div>
                    </div>
                </header>

                {teamworkTimeError !== null && (
                    <Alert>
                        <TriangleAlertIcon />
                        <AlertTitle>
                            Teamwork time could not be loaded
                        </AlertTitle>
                        <AlertDescription>{teamworkTimeError}</AlertDescription>
                    </Alert>
                )}

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
                                Scan the configured folders and this page will
                                list what you committed in the interval you
                                pick.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                onClick={() =>
                                    router.post(
                                        "/repositories/scan",
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Scan folders
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
                                Author.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}

                {repositories.length > 0 && (
                    <LoggedChart
                        days={days}
                        from={from}
                        to={to}
                        onMonth={visit}
                    />
                )}

                <div className="flex flex-col gap-8">
                    {days.map((day) => (
                        <DaySection
                            key={day.date}
                            day={day}
                            repositories={repositories}
                            projects={teamworkProjects}
                            teamworkConfigured={teamworkConfigured}
                            teamworkError={teamworkError}
                            constants={constants}
                        />
                    ))}
                </div>
            </main>
        </>
    );
}
