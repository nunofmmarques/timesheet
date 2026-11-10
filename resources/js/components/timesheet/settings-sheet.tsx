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
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import type { TimesheetSettings } from '@/types/timesheet';

export function SettingsSheet({ settings }: { settings: TimesheetSettings }) {
    const [authorEmail, setAuthorEmail] = useState(settings.authorEmail);

    return (
        <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
                <Settings2Icon data-icon="inline-start" />
                Author
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Author</SheetTitle>
                    <SheetDescription>
                        Only commits from this email are included. Leave it
                        empty to include every author.
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
                                This matches the email on the commit, not the
                                name.
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                </div>
                <SheetFooter>
                    <Button
                        onClick={() => {
                            router.put(
                                '/settings',
                                { author_email: authorEmail },
                                {
                                    preserveScroll: true,
                                    preserveState: true,
                                },
                            );
                        }}
                    >
                        Save author
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
