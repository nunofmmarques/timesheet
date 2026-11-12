import { router, useForm } from '@inertiajs/react';
import {
    CalendarIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
    TreePalmIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { AbsenceIcon, absencePartLabel } from '@/components/timesheet/absence-kind';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { todayInLisbon } from '@/lib/timesheet';
import type { AbsencePart, TimeOff } from '@/types/timesheet';

const KINDS = [
    { value: 'vacation', label: 'Vacation' },
    { value: 'paid_leave', label: 'Paid leave' },
    { value: 'parental', label: 'Parental leave' },
    { value: 'sick', label: 'Sick leave' },
    { value: 'other', label: 'Other' },
];

const PARTS: { value: AbsencePart; label: string }[] = [
    { value: 'day', label: 'Full day' },
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
];

export function TimeOffSheet({ absences }: { absences: TimeOff[] }) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<TimeOff | null>(null);
    const formOpen = adding || editing !== null;

    function closeForm() {
        setAdding(false);
        setEditing(null);
    }

    return (
        <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
                <TreePalmIcon data-icon="inline-start" />
                Time off
            </SheetTrigger>
            <SheetContent className="data-[side=right]:sm:max-w-md">
                <SheetHeader className="pb-0">
                    <SheetTitle>Time off</SheetTitle>
                    <SheetDescription>
                        Vacation, paid leave, and other days away. They show on
                        the chart.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                    {absences.length > 0 && (
                        <ul className="flex flex-col divide-y rounded-lg border">
                            {absences.map((absence) => (
                                <li
                                    key={absence.id}
                                    className="flex items-start gap-2 px-3 py-2 text-sm"
                                >
                                    <span className="flex min-w-0 flex-1 items-start gap-2">
                                        <AbsenceIcon
                                            kind={absence.kind}
                                            className="mt-0.5 size-4 shrink-0 text-tw-purple"
                                        />
                                        <span className="min-w-0">
                                            <span className="font-medium">
                                                {absence.label}
                                            </span>
                                            <span className="block text-muted-foreground">
                                                {formatRange(
                                                    absence.startsOn,
                                                    absence.endsOn,
                                                )}
                                                {absencePartLabel(absence.part)
                                                    ? ` · ${absencePartLabel(absence.part)}`
                                                    : ''}
                                                {absence.kind !== 'other' &&
                                                    absence.note !== '' &&
                                                    ` · ${absence.note}`}
                                            </span>
                                        </span>
                                    </span>
                                    <div className="flex shrink-0 items-center">
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label={`Edit ${absence.label}`}
                                            onClick={() => {
                                                setAdding(false);
                                                setEditing(absence);
                                            }}
                                        >
                                            <PencilIcon />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label={`Remove ${absence.label}`}
                                            onClick={() =>
                                                router.delete(
                                                    `/time-off/${absence.id}`,
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {formOpen ? (
                        <TimeOffForm
                            key={editing?.id ?? 'new'}
                            absence={editing}
                            onDone={closeForm}
                        />
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setEditing(null);
                                setAdding(true);
                            }}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Add time off
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

export function TimeOffForm({
    absence,
    initialDate,
    onDone,
}: {
    absence: TimeOff | null;
    initialDate?: string;
    onDone: () => void;
}) {
    const today = initialDate ?? todayInLisbon();
    const form = useForm({
        kind: absence?.kind ?? 'vacation',
        part: absence?.part ?? 'day',
        starts_on: absence?.startsOn ?? today,
        ends_on: absence?.endsOn ?? today,
        note: absence?.note ?? '',
    });
    const dateError = form.errors.starts_on ?? form.errors.ends_on;

    return (
        <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                const options = {
                    preserveScroll: true,
                    onSuccess: () => onDone(),
                };

                if (absence === null) {
                    form.post('/time-off', options);
                } else {
                    form.put(`/time-off/${absence.id}`, options);
                }
            }}
        >
            <FieldGroup>
                <Field>
                    <FieldLabel>Type</FieldLabel>
                    <Select
                        value={form.data.kind}
                        onValueChange={(value) => {
                            if (typeof value === 'string') {
                                form.setData('kind', value);
                            }
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue>
                                {(value: string | null) => {
                                    const kind = KINDS.find(
                                        (item) => item.value === value,
                                    );

                                    if (kind === undefined) {
                                        return 'Type';
                                    }

                                    return (
                                        <span className="flex items-center gap-2">
                                            <AbsenceIcon
                                                kind={kind.value}
                                                className="size-4 text-tw-purple"
                                            />
                                            {kind.label}
                                        </span>
                                    );
                                }}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                            {KINDS.map((kind) => (
                                <SelectItem key={kind.value} value={kind.value}>
                                    <AbsenceIcon
                                        kind={kind.value}
                                        className="size-4 text-tw-purple"
                                    />
                                    {kind.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError
                        errors={
                            form.errors.kind
                                ? [{ message: form.errors.kind }]
                                : undefined
                        }
                    />
                </Field>
                <Field>
                    <FieldLabel>Day</FieldLabel>
                    <ToggleGroup
                        variant="outline"
                        size="sm"
                        spacing={0}
                        className="w-full"
                        value={[form.data.part]}
                        onValueChange={(value) => {
                            const next = value.at(-1);

                            if (
                                next !== 'day' &&
                                next !== 'morning' &&
                                next !== 'afternoon'
                            ) {
                                return;
                            }

                            form.setData({
                                ...form.data,
                                part: next,
                                ends_on:
                                    next === 'day'
                                        ? form.data.ends_on
                                        : form.data.starts_on,
                            });
                        }}
                    >
                        {PARTS.map((part) => (
                            <ToggleGroupItem
                                key={part.value}
                                value={part.value}
                                className="flex-1"
                            >
                                {part.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </Field>
                <Field data-invalid={dateError ? true : undefined}>
                    <FieldLabel>Dates</FieldLabel>
                    <Popover>
                        <PopoverTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start font-normal"
                                    aria-invalid={dateError ? true : undefined}
                                />
                            }
                        >
                            <CalendarIcon data-icon="inline-start" />
                            {formatRange(
                                form.data.starts_on,
                                form.data.ends_on,
                            )}
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                            {form.data.part === 'day' ? (
                                <Calendar
                                    mode="range"
                                    weekStartsOn={1}
                                    numberOfMonths={1}
                                    defaultMonth={parseIso(form.data.starts_on)}
                                    selected={{
                                        from: parseIso(form.data.starts_on),
                                        to: parseIso(form.data.ends_on),
                                    }}
                                    onSelect={(range: DateRange | undefined) => {
                                        if (!range?.from) {
                                            return;
                                        }

                                        form.setData({
                                            ...form.data,
                                            starts_on: toIso(range.from),
                                            ends_on: toIso(
                                                range.to ?? range.from,
                                            ),
                                        });
                                    }}
                                />
                            ) : (
                                <Calendar
                                    mode="single"
                                    weekStartsOn={1}
                                    defaultMonth={parseIso(form.data.starts_on)}
                                    selected={parseIso(form.data.starts_on)}
                                    onSelect={(date: Date | undefined) => {
                                        if (date === undefined) {
                                            return;
                                        }

                                        const iso = toIso(date);

                                        form.setData({
                                            ...form.data,
                                            starts_on: iso,
                                            ends_on: iso,
                                        });
                                    }}
                                />
                            )}
                        </PopoverContent>
                    </Popover>
                    <FieldError
                        errors={
                            dateError ? [{ message: dateError }] : undefined
                        }
                    />
                </Field>
                <Field>
                    <FieldLabel htmlFor="time-off-note">
                        {form.data.kind === 'other' ? 'Name' : 'Note'}
                    </FieldLabel>
                    <Input
                        id="time-off-note"
                        value={form.data.note}
                        placeholder={
                            form.data.kind === 'other'
                                ? 'What kind of leave'
                                : 'Optional'
                        }
                        onChange={(event) =>
                            form.setData('note', event.target.value)
                        }
                    />
                    <FieldError
                        errors={
                            form.errors.note
                                ? [{ message: form.errors.note }]
                                : undefined
                        }
                    />
                </Field>
            </FieldGroup>
            <div className="flex items-center gap-2">
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Spinner data-icon="inline-start" />}
                    {absence === null ? 'Save' : 'Save changes'}
                </Button>
                <Button type="button" variant="ghost" onClick={onDone}>
                    Cancel
                </Button>
                {absence !== null && (
                    <Button
                        type="button"
                        variant="destructive"
                        className="ml-auto"
                        disabled={form.processing}
                        onClick={() =>
                            router.delete(`/time-off/${absence.id}`, {
                                preserveScroll: true,
                                onSuccess: () => onDone(),
                            })
                        }
                    >
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                    </Button>
                )}
            </div>
        </form>
    );
}

function formatRange(start: string, end: string): string {
    const from = shortDate(start);
    const to = shortDate(end);

    return from === to ? from : `${from} – ${to}`;
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

function shortDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
