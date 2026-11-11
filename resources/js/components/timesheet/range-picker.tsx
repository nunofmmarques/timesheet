import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const presets = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'last-week', label: 'Last week' },
    { value: 'month', label: 'This month' },
    { value: 'last-month', label: 'Previous month' },
];

const dayMonth = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
});

const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

export function RangePicker({
    from,
    to,
    preset,
    onChange,
}: {
    from: string;
    to: string;
    preset: string;
    onChange: (query: Record<string, string>) => void;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<DateRange | undefined>();
    const [month, setMonth] = useState(() => parseIso(from));
    const presetLabel = presets.find((item) => item.value === preset)?.label;
    const rangeLabel = formatRange(from, to);
    const selected = draft ?? { from: parseIso(from), to: parseIso(to) };

    function onOpenChange(next: boolean) {
        setOpen(next);
        setDraft(undefined);

        if (next) {
            setMonth(parseIso(from));
        }
    }

    function selectPreset(value: string) {
        setOpen(false);
        setDraft(undefined);

        if (value !== preset) {
            onChange({ preset: value });
        }
    }

    function selectRange(next: DateRange | undefined) {
        if (!next?.from || !next.to) {
            setDraft(next?.from ? next : undefined);

            return;
        }

        const start = toIso(next.from);
        const end = toIso(next.to);
        setDraft(undefined);
        setOpen(false);

        if (start === from && end === to && preset === 'custom') {
            return;
        }

        onChange({
            preset: 'custom',
            from: start > end ? end : start,
            to: start > end ? start : end,
        });
    }

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger render={<Button variant="outline" />}>
                <CalendarIcon data-icon="inline-start" />
                {presetLabel ?? rangeLabel}
                {presetLabel && (
                    <span className="text-muted-foreground">{rangeLabel}</span>
                )}
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="w-auto p-0">
                <PopoverHeader className="sr-only">
                    <PopoverTitle>Date range</PopoverTitle>
                    <PopoverDescription>
                        Choose a preset or select a start and end date.
                    </PopoverDescription>
                </PopoverHeader>
                <div className="flex">
                    <Calendar
                        mode="range"
                        selected={selected}
                        onSelect={selectRange}
                        month={month}
                        onMonthChange={setMonth}
                        numberOfMonths={2}
                        weekStartsOn={1}
                        resetOnSelect
                    />
                    <Separator orientation="vertical" />
                    <ToggleGroup
                        orientation="vertical"
                        variant="outline"
                        size="sm"
                        spacing={0}
                        className="w-40 flex-col items-stretch p-2"
                        value={preset === 'custom' || draft ? [] : [preset]}
                        onValueChange={(value) => {
                            const next = value.at(-1);

                            if (next) {
                                selectPreset(next);
                            }
                        }}
                    >
                        {presets.map((item) => (
                            <ToggleGroupItem
                                key={item.value}
                                value={item.value}
                                className="w-full justify-start"
                            >
                                {item.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function parseIso(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function formatRange(from: string, to: string): string {
    if (from === to) {
        return dayMonthYear.format(parseIso(from));
    }

    const start = parseIso(from);
    const end = parseIso(to);
    const startLabel =
        start.getFullYear() === end.getFullYear()
            ? dayMonth.format(start)
            : dayMonthYear.format(start);

    return `${startLabel} – ${dayMonthYear.format(end)}`;
}
