import type {
    SessionDraft,
    TimesheetDay,
    TimesheetSession,
} from '@/types/timesheet';

export function formatDuration(minutes: number): string {
    const safe = Math.max(0, Math.round(minutes));
    const hours = Math.floor(safe / 60);
    const rest = safe % 60;

    if (hours === 0) {
        return `${rest}m`;
    }

    if (rest === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${rest}m`;
}

export function minutesToInput(minutes: number): string {
    const hours = minutes / 60;

    if (Number.isInteger(hours)) {
        return String(hours);
    }

    return (Math.round(hours * 100) / 100).toString();
}

export function parseHours(value: string, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }

    return Math.min(1440, Math.round(parsed * 60));
}

export function buildDrafts(
    days: TimesheetDay[],
): Record<string, SessionDraft> {
    const drafts: Record<string, SessionDraft> = {};

    for (const day of days) {
        for (const session of day.sessions) {
            drafts[session.key] = {
                minutes: session.minutes,
                description: session.description,
                included: session.included,
            };
        }
    }

    return drafts;
}

export function formatEntry(
    dayLabel: string,
    session: TimesheetSession,
    draft: SessionDraft,
): string {
    const lines = [
        `${dayLabel} — ${session.repository} — ${formatDuration(draft.minutes)} (${session.startedAt}–${session.endedAt})`,
    ];
    const note = draft.description.trim();

    if (note !== '') {
        lines.push(note);
    }

    return lines.join('\n');
}

export function formatDays(
    days: TimesheetDay[],
    drafts: Record<string, SessionDraft>,
): string {
    return days
        .flatMap((day) =>
            day.sessions
                .filter((session) => drafts[session.key]?.included)
                .map((session) =>
                    formatEntry(
                        day.label,
                        session,
                        drafts[session.key] ?? {
                            minutes: session.minutes,
                            description: session.description,
                            included: session.included,
                        },
                    ),
                ),
        )
        .join('\n\n');
}
