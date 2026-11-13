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
import { HolidaysSheet } from "@/components/timesheet/holidays-sheet";
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
    holidays,
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
            <header className="sticky top-0 z-30 border-b bg-background">
                <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2">
                    <h1 className="shrink-0 pr-2 font-heading text-sm font-semibold tracking-tight">
                        Timesheet
                    </h1>
                    <nav
                        aria-label="Timesheet"
                        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
                    >
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
                        <div
                            className="mx-1.5 h-4 w-px shrink-0 bg-border"
                            aria-hidden
                        />
                        <ConstantsSheet
                            constants={constants}
                            projects={teamworkProjects}
                            configured={teamworkConfigured}
                            error={teamworkError}
                        />
                        <TimeOffSheet absences={absences} />
                        <HolidaysSheet
                            holidays={holidays}
                            year={from.slice(0, 4)}
                        />
                        <div className="ml-auto flex shrink-0 items-center">
                            <SettingsSheet settings={settings} />
                        </div>
                    </nav>
                </div>
            </header>
            <main className="flex flex-col gap-6 px-4 pb-8">
                <div className="mx-auto w-full max-w-5xl empty:hidden">
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
                        holidays={holidays}
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
                                holidays={holidays}
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

    return (
        <Button
            type="button"
            variant="outline"
            aria-hidden={!visible}
            tabIndex={visible ? 0 : -1}
            className={
                visible
                    ? "fixed right-4 bottom-4 z-40 translate-y-0 bg-background opacity-100 shadow-md transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:translate-y-0 motion-reduce:transition-opacity"
                    : "pointer-events-none fixed right-4 bottom-4 z-40 translate-y-2 bg-background opacity-0 shadow-md transition-[opacity,translate] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:translate-y-0 motion-reduce:transition-opacity"
            }
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
