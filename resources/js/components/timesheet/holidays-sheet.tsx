import { router, useForm } from "@inertiajs/react";
import { CalendarIcon, FlagIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import {
    ConfirmDeleteButton,
    SheetEditButton,
    SheetItemActions,
} from "@/components/timesheet/sheet-actions";
import { sheetNavTriggerClass } from "@/components/timesheet/sheet-nav";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { Holiday } from "@/types/holiday";

export function HolidaysSheet({
    holidays,
    year,
}: {
    holidays: Holiday[];
    year: string;
}) {
    const [open, setOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(year);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<Holiday | null>(null);
    const formOpen = adding || editing !== null;
    const years = holidayYears(holidays, selectedYear);
    const visible = holidays.filter((holiday) =>
        holiday.date.startsWith(`${selectedYear}-`),
    );

    function closeForm() {
        setAdding(false);
        setEditing(null);
    }

    function openAdd() {
        setEditing(null);
        setAdding(true);
    }

    function openEdit(holiday: Holiday) {
        setAdding(false);
        setEditing(holiday);
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (next) {
                    setSelectedYear(year);
                    closeForm();
                } else {
                    closeForm();
                }
            }}
        >
            <SheetTrigger className={sheetNavTriggerClass}>
                <FlagIcon />
                Holidays
            </SheetTrigger>
            <SheetContent className="gap-0 data-[side=right]:sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Holidays</SheetTitle>
                    <SheetDescription>
                        Portugal&apos;s national holidays. They show on the
                        chart, and you can add or rename any date.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    <Field>
                        <FieldLabel>Year</FieldLabel>
                        <Select
                            value={selectedYear}
                            onValueChange={(value) => {
                                if (typeof value !== "string") {
                                    return;
                                }

                                setSelectedYear(value);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[70]">
                                {years.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    {visible.length > 0 ? (
                        <ul className="flex flex-col divide-y rounded-lg border">
                            {visible.map((holiday) => (
                                <li
                                    key={holiday.id}
                                    className="flex items-center gap-2 px-3 py-2 text-sm"
                                >
                                    <span className="flex min-w-0 flex-1 items-center gap-2">
                                        <FlagIcon className="size-4 shrink-0 text-tw-violet" />
                                        <span className="min-w-0">
                                            <span className="font-medium">
                                                {holiday.name}
                                            </span>
                                            <span className="block text-muted-foreground">
                                                {formatHolidayDate(holiday.date)}
                                            </span>
                                        </span>
                                    </span>
                                    <SheetItemActions>
                                        <SheetEditButton
                                            label={`Edit ${holiday.name}`}
                                            onClick={() => openEdit(holiday)}
                                        />
                                        <ConfirmDeleteButton
                                            label={`Remove ${holiday.name}`}
                                            onConfirm={() =>
                                                router.delete(
                                                    `/holidays/${holiday.id}`,
                                                    { preserveScroll: true },
                                                )
                                            }
                                        />
                                    </SheetItemActions>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No holidays in {selectedYear}.
                        </p>
                    )}
                </div>
                <SheetFooter>
                    <Button type="button" onClick={openAdd}>
                        <PlusIcon data-icon="inline-start" />
                        Add holiday
                    </Button>
                </SheetFooter>
            </SheetContent>
            <Sheet
                open={formOpen}
                onOpenChange={(next) => {
                    if (!next) {
                        closeForm();
                    }
                }}
            >
                <SheetContent
                    nested
                    className="gap-0 data-[side=right]:sm:max-w-md"
                >
                    <HolidayForm
                        key={editing?.id ?? "new"}
                        holiday={editing}
                        year={selectedYear}
                        onDone={closeForm}
                    />
                </SheetContent>
            </Sheet>
        </Sheet>
    );
}

function HolidayForm({
    holiday,
    year,
    onDone,
}: {
    holiday: Holiday | null;
    year: string;
    onDone: () => void;
}) {
    const form = useForm({
        name: holiday?.name ?? "",
        date: holiday?.date ?? `${year}-01-01`,
    });

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
                event.preventDefault();
                const options = {
                    preserveScroll: true,
                    onSuccess: () => onDone(),
                };

                if (holiday === null) {
                    form.post("/holidays", options);
                } else {
                    form.put(`/holidays/${holiday.id}`, options);
                }
            }}
        >
            <SheetHeader>
                <SheetTitle>
                    {holiday === null ? "Add holiday" : "Edit holiday"}
                </SheetTitle>
                <SheetDescription>
                    {holiday === null
                        ? "Pick a date and name for the holiday."
                        : "Update the holiday name or date."}
                </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="holiday-name">Name</FieldLabel>
                        <Input
                            id="holiday-name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData("name", event.target.value)
                            }
                        />
                        <FieldError
                            errors={
                                form.errors.name
                                    ? [{ message: form.errors.name }]
                                    : undefined
                            }
                        />
                    </Field>
                    <Field data-invalid={form.errors.date ? true : undefined}>
                        <FieldLabel>Date</FieldLabel>
                        <Popover>
                            <PopoverTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start font-normal"
                                        aria-invalid={
                                            form.errors.date ? true : undefined
                                        }
                                    />
                                }
                            >
                                <CalendarIcon data-icon="inline-start" />
                                {formatHolidayDate(form.data.date)}
                            </PopoverTrigger>
                            <PopoverContent
                                align="start"
                                className="z-[70] w-auto p-0"
                            >
                                <Calendar
                                    mode="single"
                                    weekStartsOn={1}
                                    defaultMonth={parseIso(form.data.date)}
                                    selected={parseIso(form.data.date)}
                                    onSelect={(date: Date | undefined) => {
                                        if (date === undefined) {
                                            return;
                                        }

                                        form.setData("date", toIso(date));
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                        <FieldError
                            errors={
                                form.errors.date
                                    ? [{ message: form.errors.date }]
                                    : undefined
                            }
                        />
                    </Field>
                </FieldGroup>
            </div>
            <SheetFooter>
                {holiday !== null && (
                    <ConfirmDeleteButton
                        labeled
                        className="sm:mr-auto"
                        label={`Remove ${holiday.name}`}
                        disabled={form.processing}
                        onConfirm={() =>
                            router.delete(`/holidays/${holiday.id}`, {
                                preserveScroll: true,
                                onSuccess: () => onDone(),
                            })
                        }
                    />
                )}
                <Button
                    type="button"
                    variant="outline"
                    disabled={form.processing}
                    onClick={onDone}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Spinner data-icon="inline-start" />}
                    {holiday === null ? "Save" : "Save changes"}
                </Button>
            </SheetFooter>
        </form>
    );
}

function holidayYears(holidays: Holiday[], selected: string): string[] {
    const years = new Set(holidays.map((holiday) => holiday.date.slice(0, 4)));
    years.add(selected);

    return [...years].filter((year) => year !== "").sort();
}

function formatHolidayDate(value: string): string {
    const date = parseIso(value);

    return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

function parseIso(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
}
