import { router } from '@inertiajs/react';
import { Settings2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import type { TimesheetSettings } from '@/types/timesheet';

const roundOptions = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '5', label: '5 minutes' },
    { value: '1', label: 'Exact minute' },
];

export function SettingsSheet({ settings }: { settings: TimesheetSettings }) {
    const [authorEmail, setAuthorEmail] = useState(settings.authorEmail);
    const [idleGapMinutes, setIdleGapMinutes] = useState(
        String(settings.idleGapMinutes),
    );
    const [paddingMinutes, setPaddingMinutes] = useState(
        String(settings.paddingMinutes),
    );
    const [minimumMinutes, setMinimumMinutes] = useState(
        String(settings.minimumMinutes),
    );
    const [roundToMinutes, setRoundToMinutes] = useState(
        String(settings.roundToMinutes),
    );

    return (
        <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
                <Settings2Icon data-icon="inline-start" />
                Interval
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Work intervals</SheetTitle>
                    <SheetDescription>
                        A new timesheet line starts when you switch project, or
                        when the gap between commits is longer than the quiet
                        period. Hours run from the first commit to the last,
                        plus a little padding, then round.
                    </SheetDescription>
                </SheetHeader>
                <div className="px-4">
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="author-email">
                                Only my commits
                            </FieldLabel>
                            <Input
                                id="author-email"
                                type="email"
                                value={authorEmail}
                                placeholder="you@example.com"
                                onChange={(event) =>
                                    setAuthorEmail(event.target.value)
                                }
                            />
                            <FieldDescription>
                                Leave this empty to include every author.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="idle-gap">
                                Quiet gap (minutes)
                            </FieldLabel>
                            <Input
                                id="idle-gap"
                                type="number"
                                min={5}
                                max={720}
                                value={idleGapMinutes}
                                onChange={(event) =>
                                    setIdleGapMinutes(event.target.value)
                                }
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="padding">
                                Padding (minutes)
                            </FieldLabel>
                            <Input
                                id="padding"
                                type="number"
                                min={0}
                                max={240}
                                value={paddingMinutes}
                                onChange={(event) =>
                                    setPaddingMinutes(event.target.value)
                                }
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="minimum">
                                Minimum (minutes)
                            </FieldLabel>
                            <Input
                                id="minimum"
                                type="number"
                                min={0}
                                max={480}
                                value={minimumMinutes}
                                onChange={(event) =>
                                    setMinimumMinutes(event.target.value)
                                }
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="round-to">Round to</FieldLabel>
                            <Select
                                value={roundToMinutes}
                                onValueChange={(value) => {
                                    if (value) {
                                        setRoundToMinutes(value);
                                    }
                                }}
                            >
                                <SelectTrigger id="round-to" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {roundOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>
                </div>
                <SheetFooter>
                    <Button
                        onClick={() => {
                            router.put(
                                '/settings',
                                {
                                    author_email: authorEmail,
                                    idle_gap_minutes: Number(idleGapMinutes),
                                    padding_minutes: Number(paddingMinutes),
                                    minimum_minutes: Number(minimumMinutes),
                                    round_to_minutes: Number(roundToMinutes),
                                },
                                {
                                    preserveScroll: true,
                                    preserveState: true,
                                },
                            );
                        }}
                    >
                        Save interval
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
