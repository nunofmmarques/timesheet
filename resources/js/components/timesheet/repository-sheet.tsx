import { router, usePage } from '@inertiajs/react';
import { FolderKanbanIcon, FolderSearchIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { FolderMark, folderMark } from '@/components/timesheet/folder-mark';
import {
    ConfirmDeleteButton,
    SheetItemActions,
} from '@/components/timesheet/sheet-actions';
import {
    sheetNavCountClass,
    sheetNavTriggerClass,
} from '@/components/timesheet/sheet-nav';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { RepositoryRecord } from '@/types/repository';

export function RepositorySheet({
    repositories,
    discoverRoots,
}: {
    repositories: RepositoryRecord[];
    discoverRoots: string[];
}) {
    const errors = usePage().props.errors as Record<string, string | undefined>;
    const [query, setQuery] = useState('');
    const [scanning, setScanning] = useState(false);
    const enabled = repositories.filter((repository) => repository.enabled);
    const needle = query.trim().toLowerCase();
    const visible = repositories.filter((repository) => {
        if (needle === '') {
            return true;
        }

        const mark = folderMark(repository.path, discoverRoots);

        return (
            repository.name.toLowerCase().includes(needle) ||
            repository.path.toLowerCase().includes(needle) ||
            (mark?.label.toLowerCase().includes(needle) ?? false)
        );
    });

    function scan() {
        router.post(
            '/repositories/scan',
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setScanning(true),
                onFinish: () => setScanning(false),
            },
        );
    }

    return (
        <Sheet>
            <SheetTrigger className={sheetNavTriggerClass}>
                <FolderSearchIcon />
                Repositories
                <span className={sheetNavCountClass}>
                    {enabled.length}/{repositories.length}
                </span>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader className="pb-0">
                    <SheetTitle>Repositories</SheetTitle>
                    <SheetDescription>
                        Commits are read from the Git projects you leave on.
                        Scan checks every configured folder.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4">
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-4">
                        <p className="text-sm font-medium">Scan folders</p>
                        {discoverRoots.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No scan folders are configured.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-1.5">
                                {discoverRoots.map((root) => (
                                    <li key={root}>
                                        <FolderMark
                                            path={root}
                                            roots={discoverRoots}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Field
                            data-invalid={errors.directory ? true : undefined}
                            className="mt-2"
                        >
                            <Button
                                type="button"
                                disabled={
                                    scanning || discoverRoots.length === 0
                                }
                                onClick={scan}
                            >
                                {scanning ? (
                                    <Spinner data-icon="inline-start" />
                                ) : (
                                    <FolderSearchIcon data-icon="inline-start" />
                                )}
                                Scan
                            </Button>
                            <FieldError
                                errors={
                                    errors.directory
                                        ? [{ message: errors.directory }]
                                        : undefined
                                }
                            />
                        </Field>
                    </div>
                    <Field>
                        <FieldLabel htmlFor="repository-search">
                            Search repositories
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="repository-search"
                                type="search"
                                value={query}
                                placeholder="Name or path"
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                            />
                        </InputGroup>
                    </Field>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
                    {visible.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No repositories match.
                        </p>
                    )}
                    {visible.map((repository) => (
                        <div
                            key={repository.id}
                            className="flex items-center gap-3 rounded-lg border px-3 py-2"
                        >
                            <Switch
                                checked={repository.enabled}
                                onCheckedChange={(checked) => {
                                    router.patch(
                                        `/repositories/${repository.id}`,
                                        { enabled: checked === true },
                                        {
                                            preserveScroll: true,
                                            preserveState: true,
                                        },
                                    );
                                }}
                                aria-label={`Include ${repository.name}`}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">
                                    {repository.name}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <FolderMark
                                        path={repository.path}
                                        roots={discoverRoots}
                                    />
                                    {repository.teamworkProjectName !==
                                        null && (
                                        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                                            <FolderKanbanIcon className="size-3.5 shrink-0" />
                                            <span className="truncate">
                                                {repository.teamworkProjectName}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>
                            <SheetItemActions>
                                <ConfirmDeleteButton
                                    label={`Remove ${repository.name}`}
                                    onConfirm={() =>
                                        router.delete(
                                            `/repositories/${repository.id}`,
                                            {
                                                preserveScroll: true,
                                                preserveState: true,
                                            },
                                        )
                                    }
                                />
                            </SheetItemActions>
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}
