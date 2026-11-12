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

export function todayInLisbon(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Lisbon',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? '';

    return `${value('year')}-${value('month')}-${value('day')}`;
}
