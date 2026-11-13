import { router } from "@inertiajs/react";
import {
    ExternalLinkIcon,
    FolderKanbanIcon,
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
import { TeamworkLogo } from "@/components/timesheet/teamwork-logo";
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
import { Field, FieldLabel } from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { RepositoryRecord } from "@/types/repository";
import type { TeamworkProject } from "@/types/teamwork";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

type ProjectOption = {
    value: string;
    label: string;
};

export function TeamworkSheet({
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
    const [query, setQuery] = useState("");
    const linked = repositories.filter(
        (repository) => repository.teamworkProjectId !== null,
    ).length;
    const needle = query.trim().toLowerCase();
    const options = useMemo<ProjectOption[]>(
        () =>
            projects.map((project) => ({
                value: String(project.id),
                label: project.name,
            })),
        [projects],
    );
    const visibleRepositories = repositories.filter((repository) => {
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
    const disabled = !configured || error !== null;

    return (
        <Sheet>
            <SheetTrigger className={sheetNavTriggerClass}>
                <TeamworkLogo variant="transparent" className="size-6" />
                Teamwork
                <span className={sheetNavCountClass}>
                    {linked}/{repositories.length}
                </span>
            </SheetTrigger>
            <SheetContent className="data-[side=right]:sm:max-w-md">
                <SheetHeader className="pb-0">
                    <SheetTitle>Teamwork projects</SheetTitle>
                    <SheetDescription>
                        Link each repository to one Teamwork project. The hours
                        stay on this page for now.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
                    <Field>
                        <FieldLabel htmlFor="teamwork-search">
                            Search repositories
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="teamwork-search"
                                type="search"
                                value={query}
                                placeholder="Repository or Teamwork project"
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                            />
                        </InputGroup>
                    </Field>
                    {!configured && (
                        <p className="text-sm text-muted-foreground">
                            Add TEAMWORK_URL and TEAMWORK_TOKEN to the
                            environment, then reload this page.
                        </p>
                    )}
                    {error !== null && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                    {visibleRepositories.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No repositories match.
                        </p>
                    )}
                    <RepositoryGroup
                        title="Linked"
                        repositories={visibleRepositories.filter(
                            (repository) =>
                                repository.teamworkProjectId !== null,
                        )}
                        options={options}
                        discoverRoots={discoverRoots}
                        disabled={disabled}
                    />
                    <Separator className="my-4" />
                    <RepositoryGroup
                        title="Not linked"
                        repositories={visibleRepositories.filter(
                            (repository) =>
                                repository.teamworkProjectId === null,
                        )}
                        options={options}
                        discoverRoots={discoverRoots}
                        disabled={disabled}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

function RepositoryGroup({
    title,
    repositories,
    options,
    discoverRoots,
    disabled,
}: {
    title: string;
    repositories: RepositoryRecord[];
    options: ProjectOption[];
    discoverRoots: string[];
    disabled: boolean;
}) {
    if (repositories.length === 0) {
        return null;
    }

    return (
        <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                {title}
                <Badge variant={"secondary"} className="tabular-nums">
                    {repositories.length}
                </Badge>
            </h3>
            <div className="flex flex-col gap-2">
                {repositories.map((repository) => (
                    <div
                        key={repository.id}
                        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
                    >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                            <FolderMark
                                path={repository.path}
                                roots={discoverRoots}
                                hideLabel={true}
                            />
                            <div className="truncate text-sm font-medium">
                                {repository.name}
                            </div>
                        </div>
                        <div className="w-40 shrink-0">
                            <ProjectPicker
                                repository={repository}
                                options={options}
                                disabled={disabled}
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
                                                { teamwork_project_id: null },
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
    options,
    disabled,
}: {
    repository: RepositoryRecord;
    options: ProjectOption[];
    disabled: boolean;
}) {
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
