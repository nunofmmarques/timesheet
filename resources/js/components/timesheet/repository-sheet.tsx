import { router, usePage } from '@inertiajs/react';
import { FolderPlusIcon, FolderSearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import type { RepositoryRecord } from '@/types/timesheet';

export function RepositorySheet({
    repositories,
    discoverRoot,
    discoverRoots,
}: {
    repositories: RepositoryRecord[];
    discoverRoot: string;
    discoverRoots: string[];
}) {
    const errors = usePage().props.errors as Record<string, string | undefined>;
    const [directory, setDirectory] = useState(discoverRoot);
    const [path, setPath] = useState('');
    const [scanning, setScanning] = useState(false);
    const enabled = repositories.filter((repository) => repository.enabled);

    function scan(folder: string) {
        setDirectory(folder);
        router.post(
            '/repositories/scan',
            { directory: folder },
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
            <SheetTrigger render={<Button variant="outline" />}>
                <FolderPlusIcon data-icon="inline-start" />
                Repositories
                <span className="text-muted-foreground">
                    {enabled.length}/{repositories.length}
                </span>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Repositories</SheetTitle>
                    <SheetDescription>
                        Commits are read from the Git projects you leave on.
                        Scan a folder to pick up every repo inside it.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4">
                    <FieldGroup>
                        <Field
                            data-invalid={errors.directory ? true : undefined}
                        >
                            <FieldLabel htmlFor="scan-directory">
                                Scan folder
                            </FieldLabel>
                            <Input
                                id="scan-directory"
                                value={directory}
                                aria-invalid={
                                    errors.directory ? true : undefined
                                }
                                onChange={(event) =>
                                    setDirectory(event.target.value)
                                }
                            />
                            <FieldError
                                errors={
                                    errors.directory
                                        ? [{ message: errors.directory }]
                                        : undefined
                                }
                            />
                            <div className="flex flex-wrap gap-2">
                                {discoverRoots.map((root) => (
                                    <Button
                                        key={root}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={scanning}
                                        onClick={() => scan(root)}
                                    >
                                        <FolderSearchIcon data-icon="inline-start" />
                                        {root.split('/').filter(Boolean).at(-1)}
                                    </Button>
                                ))}
                            </div>
                            <Button
                                type="button"
                                disabled={scanning}
                                onClick={() => scan(directory)}
                            >
                                {scanning ? (
                                    <Spinner data-icon="inline-start" />
                                ) : (
                                    <FolderSearchIcon data-icon="inline-start" />
                                )}
                                Scan
                            </Button>
                        </Field>
                        <Field data-invalid={errors.path ? true : undefined}>
                            <FieldLabel htmlFor="repository-path">
                                Add one repository
                            </FieldLabel>
                            <Input
                                id="repository-path"
                                value={path}
                                placeholder="/Users/you/code/client"
                                aria-invalid={errors.path ? true : undefined}
                                onChange={(event) =>
                                    setPath(event.target.value)
                                }
                            />
                            <FieldError
                                errors={
                                    errors.path
                                        ? [{ message: errors.path }]
                                        : undefined
                                }
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    router.post(
                                        '/repositories',
                                        { path },
                                        {
                                            preserveScroll: true,
                                            preserveState: true,
                                            onSuccess: () => setPath(''),
                                        },
                                    );
                                }}
                            >
                                <FolderPlusIcon data-icon="inline-start" />
                                Add
                            </Button>
                        </Field>
                    </FieldGroup>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
                    {repositories.map((repository) => (
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
                                <div className="truncate text-muted-foreground">
                                    {repository.path}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    router.delete(
                                        `/repositories/${repository.id}`,
                                        {
                                            preserveScroll: true,
                                            preserveState: true,
                                        },
                                    );
                                }}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}
