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
