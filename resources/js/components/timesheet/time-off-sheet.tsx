import { router, useForm } from '@inertiajs/react';
import { PencilIcon, PlusIcon, Trash2Icon, TreePalmIcon } from 'lucide-react';
import { useState } from 'react';
import { AbsenceIcon } from '@/components/timesheet/absence-kind';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { todayInLisbon } from '@/lib/timesheet';
import type { TimeOff } from '@/types/timesheet';

const KINDS = [
    { value: 'vacation', label: 'Vacation' },
    { value: 'paid_leave', label: 'Paid leave' },
    { value: 'parental', label: 'Parental leave' },
    { value: 'sick', label: 'Sick leave' },
    { value: 'other', label: 'Other' },
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

function TimeOffForm({
    absence,
    onDone,
}: {
    absence: TimeOff | null;
    onDone: () => void;
}) {
    const today = todayInLisbon();
    const form = useForm({
        kind: absence?.kind ?? 'vacation',
        starts_on: absence?.startsOn ?? today,
        ends_on: absence?.endsOn ?? today,
        note: absence?.note ?? '',
    });

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
                <div className="grid grid-cols-2 gap-3">
                    <Field>
                        <FieldLabel htmlFor="time-off-start">From</FieldLabel>
                        <Input
                            id="time-off-start"
                            type="date"
                            value={form.data.starts_on}
                            onChange={(event) =>
                                form.setData('starts_on', event.target.value)
                            }
                        />
                        <FieldError
                            errors={
                                form.errors.starts_on
                                    ? [{ message: form.errors.starts_on }]
                                    : undefined
                            }
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="time-off-end">To</FieldLabel>
                        <Input
                            id="time-off-end"
                            type="date"
                            value={form.data.ends_on}
                            onChange={(event) =>
                                form.setData('ends_on', event.target.value)
                            }
                        />
                        <FieldError
                            errors={
                                form.errors.ends_on
                                    ? [{ message: form.errors.ends_on }]
                                    : undefined
                            }
                        />
                    </Field>
                </div>
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
            </div>
        </form>
    );
}

function formatRange(start: string, end: string): string {
    const from = shortDate(start);
    const to = shortDate(end);

    return from === to ? from : `${from} – ${to}`;
}

function shortDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
