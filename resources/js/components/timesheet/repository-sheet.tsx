import { router, usePage } from "@inertiajs/react";
import {
    ExternalLinkIcon,
    FolderKanbanIcon,
    FolderSearchIcon,
    SearchIcon,
    UnlinkIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FolderMark, folderMark } from "@/components/timesheet/folder-mark";
import {
    ConfirmDeleteButton,
    SheetItemActions,
} from "@/components/timesheet/sheet-actions";
import {
    sheetNavCountClass,
    sheetNavTriggerClass,
} from "@/components/timesheet/sheet-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { RepositoryRecord } from "@/types/repository";
import type { TeamworkProject } from "@/types/teamwork";

type ProjectOption = {
    value: string;
    label: string;
};

export function RepositorySheet({
    repositories,
    projects,
    discoverRoots,
    configured,
    error,
}: {
    repositories: RepositoryRecord[];
    projects: TeamworkProject[];
    discoverRoots: string[];
    configured: boolean;
    error: string | null;
}) {
    const errors = usePage().props.errors as Record<string, string | undefined>;
    const [query, setQuery] = useState("");
    const [scanning, setScanning] = useState(false);
    const enabled = repositories.filter((repository) => repository.enabled);
    const needle = query.trim().toLowerCase();
    const visible = repositories.filter((repository) => {
        if (needle === "") {
            return true;
        }

        const mark = folderMark(repository.path, discoverRoots);

        return (
            repository.name.toLowerCase().includes(needle) ||
            repository.path.toLowerCase().includes(needle) ||
            (mark?.label.toLowerCase().includes(needle) ?? false) ||
            (repository.teamworkProjectName?.toLowerCase().includes(needle) ??
                false)
        );
    });
    const active = visible
        .filter((repository) => repository.enabled)
        .sort((left, right) => {
            const leftLinked = left.teamworkProjectId !== null ? 0 : 1;
            const rightLinked = right.teamworkProjectId !== null ? 0 : 1;

            if (leftLinked !== rightLinked) {
                return leftLinked - rightLinked;
            }

            return left.name.localeCompare(right.name);
        });
    const inactive = visible.filter((repository) => !repository.enabled);
    const pickerDisabled = !configured || error !== null;

    function scan() {
        router.post(
            "/repositories/scan",
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
            <SheetContent className="data-[side=right]:sm:max-w-md">
                <SheetHeader className="pb-0">
                    <SheetTitle>Repositories</SheetTitle>
                    <SheetDescription>
                        Turn repositories on for commits, and link each one to a
                        Teamwork project.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4 pt-4">
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
                                placeholder="Name, path, or project"
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                            />
                        </InputGroup>
                    </Field>
                    {!configured && (
                        <p className="text-sm text-muted-foreground">
                            Add TEAMWORK_URL and TEAMWORK_TOKEN to link
                            projects.
                        </p>
                    )}
                    {error !== null && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
                    {visible.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No repositories match.
                        </p>
                    )}
                    <RepositoryGroup
                        title="Active"
                        repositories={active}
                        projects={projects}
                        discoverRoots={discoverRoots}
                        pickerDisabled={pickerDisabled}
                    />
                    {active.length > 0 && inactive.length > 0 && (
                        <Separator className="my-1" />
                    )}
                    <RepositoryGroup
                        title="Inactive"
                        repositories={inactive}
                        projects={projects}
                        discoverRoots={discoverRoots}
                        pickerDisabled={pickerDisabled}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

function RepositoryGroup({
    title,
    repositories,
    projects,
    discoverRoots,
    pickerDisabled,
}: {
    title: string;
    repositories: RepositoryRecord[];
    projects: TeamworkProject[];
    discoverRoots: string[];
    pickerDisabled: boolean;
}) {
    if (repositories.length === 0) {
        return null;
    }

    return (
        <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                {title}
                <Badge variant="secondary" className="tabular-nums">
                    {repositories.length}
                </Badge>
            </h3>
            <div className="flex flex-col gap-2">
                {repositories.map((repository) => (
                    <div
                        key={repository.id}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2"
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
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <FolderMark
                                path={repository.path}
                                roots={discoverRoots}
                                hideLabel
                            />
                            <div className="truncate text-sm font-medium">
                                {repository.name}
                            </div>
                        </div>
                        <div className="w-40 shrink-0">
                            <ProjectPicker
                                repository={repository}
                                projects={projects}
                                disabled={pickerDisabled}
                            />
                        </div>
                        {(repository.teamworkProjectUrl !== null ||
                            repository.teamworkProjectId !== null) && (
                            <SheetItemActions>
                                {repository.teamworkProjectUrl !== null && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        nativeButton={false}
                                        render={
                                            <a
                                                href={
                                                    repository.teamworkProjectUrl
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label={`Open ${repository.teamworkProjectName ?? "project"} in Teamwork`}
                                            />
                                        }
                                    >
                                        <ExternalLinkIcon />
                                    </Button>
                                )}
                                {repository.teamworkProjectId !== null && (
                                    <ConfirmDeleteButton
                                        label={`Unlink ${repository.name}`}
                                        idleLabel="Unlink"
                                        confirmLabel="Confirm unlink"
                                        icon={<UnlinkIcon />}
                                        onConfirm={() =>
                                            router.patch(
                                                `/repositories/${repository.id}`,
                                                {
                                                    teamwork_project_id: null,
                                                },
                                                {
                                                    preserveScroll: true,
                                                    preserveState: true,
                                                },
                                            )
                                        }
                                    />
                                )}
                            </SheetItemActions>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

function ProjectPicker({
    repository,
    projects,
    disabled,
}: {
    repository: RepositoryRecord;
    projects: TeamworkProject[];
    disabled: boolean;
}) {
    const options = useMemo<ProjectOption[]>(
        () =>
            projects
                .filter(
                    (project) =>
                        project.enabled ||
                        project.id === repository.teamworkProjectId,
                )
                .map((project) => ({
                    value: String(project.id),
                    label: project.name,
                })),
        [projects, repository.teamworkProjectId],
    );
    const selected =
        options.find(
            (option) =>
                option.value === String(repository.teamworkProjectId),
        ) ?? null;

    return (
        <Combobox
            items={options}
            value={selected}
            disabled={disabled}
            isItemEqualToValue={(left, right) => left.value === right.value}
            onValueChange={(option) => {
                if (option === null || option.value === selected?.value) {
                    return;
                }

                router.patch(
                    `/repositories/${repository.id}`,
                    {
                        teamwork_project_id: Number(option.value),
                    },
                    {
                        preserveScroll: true,
                        preserveState: true,
                    },
                );
            }}
        >
            <ComboboxTrigger
                disabled={disabled}
                aria-label={`Teamwork project for ${repository.name}`}
                className="flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5"
            >
                <FolderKanbanIcon
                    className={cn(
                        "shrink-0",
                        selected === null && "text-muted-foreground",
                    )}
                />
                <span
                    className={cn(
                        "min-w-0 flex-1 truncate",
                        selected === null && "text-muted-foreground",
                    )}
                >
                    {selected?.label ?? "No project"}
                </span>
            </ComboboxTrigger>
            <ComboboxContent align="end" className="w-72">
                <ComboboxInput
                    className="w-full"
                    showTrigger={false}
                    placeholder="Search projects"
                    aria-label={`Search Teamwork projects for ${repository.name}`}
                >
                    <InputGroupAddon>
                        <SearchIcon />
                    </InputGroupAddon>
                </ComboboxInput>
                <ComboboxEmpty>No projects match.</ComboboxEmpty>
                <ComboboxList>
                    {(option: ProjectOption) => (
                        <ComboboxItem key={option.value} value={option}>
                            <span className="truncate">{option.label}</span>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
