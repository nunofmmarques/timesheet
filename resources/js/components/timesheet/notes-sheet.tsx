import { router, useForm } from "@inertiajs/react";
import { CalendarIcon, PlusIcon, StickyNoteIcon } from "lucide-react";
import { useState } from "react";
import {
    ConfirmDeleteButton,
    SheetEditButton,
    SheetItemActions,
} from "@/components/timesheet/sheet-actions";
import { sheetNavTriggerClass } from "@/components/timesheet/sheet-nav";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DialogFooter } from "@/components/ui/dialog";
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
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { todayInLisbon } from "@/lib/timesheet";
import type { DayNote } from "@/types/day-note";

export function NotesSheet({ notes }: { notes: DayNote[] }) {
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<DayNote | null>(null);
    const formOpen = adding || editing !== null;

    function closeForm() {
        setAdding(false);
        setEditing(null);
    }

    function openAdd() {
        setEditing(null);
        setAdding(true);
    }

    function openEdit(note: DayNote) {
        setAdding(false);
        setEditing(note);
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    closeForm();
                }
            }}
        >
            <SheetTrigger className={sheetNavTriggerClass}>
                <StickyNoteIcon />
                Notes
            </SheetTrigger>
            <SheetContent className="gap-0 data-[side=right]:sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Notes</SheetTitle>
                    <SheetDescription>
                        Day notes with an optional time. They show on the day
                        detail.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    {notes.length > 0 ? (
                        <ul className="flex flex-col divide-y rounded-lg border">
                            {notes.map((note) => (
                                <li
                                    key={note.id}
                                    className="flex items-start gap-2 px-3 py-2 text-sm"
                                >
                                    <span className="flex min-w-0 flex-1 items-start gap-2">
                                        <StickyNoteIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                        <span className="min-w-0">
                                            <span className="whitespace-pre-wrap font-medium">
                                                {note.body}
                                            </span>
                                            <span className="block text-muted-foreground">
                                                {formatNoteDate(note.date)}
                                                {note.time !== null
                                                    ? ` · ${note.time}`
                                                    : ""}
                                            </span>
                                        </span>
                                    </span>
                                    <SheetItemActions>
                                        <SheetEditButton
                                            label="Edit note"
                                            onClick={() => openEdit(note)}
                                        />
                                        <ConfirmDeleteButton
                                            label="Remove note"
                                            onConfirm={() =>
                                                router.delete(
                                                    `/notes/${note.id}`,
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
                            No notes saved yet.
                        </p>
                    )}
                </div>
                <SheetFooter>
                    <Button type="button" onClick={openAdd}>
                        <PlusIcon data-icon="inline-start" />
                        Add note
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
                    <NoteForm
                        key={editing?.id ?? "new"}
                        note={editing}
                        initialDate={todayInLisbon()}
                        variant="sheet"
                        onDone={closeForm}
                    />
                </SheetContent>
            </Sheet>
        </Sheet>
    );
}

export function NoteForm({
    note,
    initialDate,
    variant = "dialog",
    onDone,
}: {
    note: DayNote | null;
    initialDate?: string;
    variant?: "dialog" | "sheet";
    onDone: () => void;
}) {
    const form = useForm({
        date: note?.date ?? initialDate ?? todayInLisbon(),
        time: note?.time ?? "",
        body: note?.body ?? "",
    });
    const Footer = variant === "sheet" ? SheetFooter : DialogFooter;

    return (
        <form
            className={
                variant === "sheet"
                    ? "flex min-h-0 flex-1 flex-col"
                    : "flex flex-col gap-4"
            }
            onSubmit={(event) => {
                event.preventDefault();
                const options = {
                    preserveScroll: true,
                    onSuccess: () => onDone(),
                };

                if (note === null) {
                    form.post("/notes", options);
                } else {
                    form.put(`/notes/${note.id}`, options);
                }
            }}
        >
            {variant === "sheet" && (
                <SheetHeader>
                    <SheetTitle>
                        {note === null ? "Add note" : "Edit note"}
                    </SheetTitle>
                    <SheetDescription>
                        {note === null
                            ? "Pick a date, optional time, and the note text."
                            : "Update this note."}
                    </SheetDescription>
                </SheetHeader>
            )}
            <div
                className={
                    variant === "sheet"
                        ? "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
                        : undefined
                }
            >
                <FieldGroup>
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
                                {formatNoteDate(form.data.date)}
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
                    <Field data-invalid={form.errors.time ? true : undefined}>
                        <FieldLabel htmlFor="note-time">Time</FieldLabel>
                        <Input
                            id="note-time"
                            type="time"
                            value={form.data.time}
                            onChange={(event) =>
                                form.setData("time", event.target.value)
                            }
                        />
                        <FieldError
                            errors={
                                form.errors.time
                                    ? [{ message: form.errors.time }]
                                    : undefined
                            }
                        />
                    </Field>
                    <Field data-invalid={form.errors.body ? true : undefined}>
                        <FieldLabel htmlFor="note-body">Note</FieldLabel>
                        <Textarea
                            id="note-body"
                            value={form.data.body}
                            rows={4}
                            placeholder="What to remember"
                            onChange={(event) =>
                                form.setData("body", event.target.value)
                            }
                        />
                        <FieldError
                            errors={
                                form.errors.body
                                    ? [{ message: form.errors.body }]
                                    : undefined
                            }
                        />
                    </Field>
                </FieldGroup>
            </div>
            <Footer>
                {note !== null && (
                    <ConfirmDeleteButton
                        labeled
                        className="sm:mr-auto"
                        label="Remove note"
                        disabled={form.processing}
                        onConfirm={() =>
                            router.delete(`/notes/${note.id}`, {
                                preserveScroll: true,
                                onSuccess: () => onDone(),
                            })
                        }
                    />
                )}
                <Button
                    type="button"
                    variant={variant === "sheet" ? "outline" : "ghost"}
                    disabled={form.processing}
                    onClick={onDone}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Spinner data-icon="inline-start" />}
                    {note === null ? "Save" : "Save changes"}
                </Button>
            </Footer>
        </form>
    );
}

function formatNoteDate(value: string): string {
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
