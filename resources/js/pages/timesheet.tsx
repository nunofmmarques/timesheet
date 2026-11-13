import { Head, router, usePage } from "@inertiajs/react";
import {
    ArrowUpIcon,
    GitCommitHorizontalIcon,
    TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DaySection } from "@/components/timesheet/day-section";
import { LoggedChart } from "@/components/timesheet/logged-chart";
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
import { todayInLisbon } from "@/lib/timesheet";
import type { TimesheetPageProps } from "@/types/timesheet";

export default function Timesheet({
    from,
    to,
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
    const today = todayInLisbon();
    const listedDays = isCurrentMonth(from, to, today)
        ? days.filter((day) => day.date <= today)
        : days;
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
            <main className="flex flex-col gap-6 px-4 py-8">
                <div className="mx-auto w-full max-w-5xl">
                    <header className="flex flex-col gap-4">
                        <div className="flex max-w-xl flex-col gap-1">
                            <h1 className="font-heading text-2xl font-medium tracking-tight">
                                Timesheet
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Projects and commits for each day, with the
                                working day split across them.
                            </p>
                        </div>
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
                    </header>

                    {teamworkTimeError !== null && (
                        <Alert>
                            <TriangleAlertIcon />
                            <AlertTitle>
                                Teamwork time could not be loaded
                            </AlertTitle>
                            <AlertDescription>
                                {teamworkTimeError}
                            </AlertDescription>
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
                                    Scan the configured folders and this page
                                    will list what you committed.
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
                                <EmptyTitle>
                                    No commits in this interval
                                </EmptyTitle>
                                <EmptyDescription>
                                    {settings.authorEmail
                                        ? `Nothing from ${settings.authorEmail} between ${from} and ${to}.`
                                        : `Nothing between ${from} and ${to}.`}{" "}
                                    Widen the dates, or clear the author filter
                                    in Author.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </div>

                {repositories.length > 0 && (
                    <LoggedChart
                        days={days}
                        from={from}
                        to={to}
                        onNavigate={visit}
                    />
                )}

                <div className="mx-auto w-full max-w-5xl">
                    <div className="flex flex-col gap-8">
                        {listedDays.map((day) => (
                            <DaySection
                                key={day.date}
                                day={day}
                                repositories={repositories}
                                projects={teamworkProjects}
                                teamworkConfigured={teamworkConfigured}
                                teamworkError={teamworkError}
                                constants={constants}
                                absences={absences}
                            />
                        ))}
                    </div>
                </div>
            </main>
            <BackToTop />
        </>
    );
}

function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        function onScroll() {
            setVisible(window.scrollY > 480);
        }

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <Button
            type="button"
            variant="outline"
            className="fixed right-4 bottom-20 z-40 bg-background shadow-md"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
            <ArrowUpIcon data-icon="inline-start" />
            Back to top
        </Button>
    );
}

function isCurrentMonth(from: string, to: string, today: string): boolean {
    const [year, month] = today.split("-").map(Number);

    if (!year || !month) {
        return false;
    }

    const monthText = String(month).padStart(2, "0");
    const start = `${year}-${monthText}-01`;
    const last = new Date(year, month, 0).getDate();
    const end = `${year}-${monthText}-${String(last).padStart(2, "0")}`;

    return from === start && to === end;
}
