import { router } from "@inertiajs/react";
import { ExternalLinkIcon, FolderKanbanIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import {
    sheetNavCountClass,
    sheetNavTriggerClass,
} from "@/components/timesheet/sheet-nav";
import { TeamworkLogo } from "@/components/timesheet/teamwork-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { Switch } from "@/components/ui/switch";
import type { TeamworkProject } from "@/types/teamwork";

export function TeamworkSheet({
    projects,
    configured,
    error,
}: {
    projects: TeamworkProject[];
    configured: boolean;
    error: string | null;
}) {
    const [query, setQuery] = useState("");
    const activeCount = projects.filter((project) => project.enabled).length;
    const needle = query.trim().toLowerCase();
    const visible = projects.filter((project) =>
        needle === "" ? true : project.name.toLowerCase().includes(needle),
    );
    const active = visible.filter((project) => project.enabled);
    const inactive = visible.filter((project) => !project.enabled);
    const disabled = !configured || error !== null;

    return (
        <Sheet>
            <SheetTrigger className={sheetNavTriggerClass}>
                <TeamworkLogo variant="transparent" className="size-6" />
                Teamwork
                <span className={sheetNavCountClass}>
                    {activeCount}/{projects.length}
                </span>
            </SheetTrigger>
            <SheetContent className="data-[side=right]:sm:max-w-md">
                <SheetHeader className="pb-0">
                    <SheetTitle>Teamwork projects</SheetTitle>
                    <SheetDescription>
                        Turn off projects you do not use. Inactive projects stay
                        out of linking and logging pickers.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
                    <Field>
                        <FieldLabel htmlFor="teamwork-search">
                            Search projects
                        </FieldLabel>
                        <InputGroup>
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                id="teamwork-search"
                                type="search"
                                value={query}
                                placeholder="Project name"
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
                    {visible.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No projects match.
                        </p>
                    )}
                    <ProjectGroup
                        title="Active"
                        projects={active}
                        disabled={disabled}
                    />
                    {active.length > 0 && inactive.length > 0 && (
                        <Separator className="my-1" />
                    )}
                    <ProjectGroup
                        title="Inactive"
                        projects={inactive}
                        disabled={disabled}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

function ProjectGroup({
    title,
    projects,
    disabled,
}: {
    title: string;
    projects: TeamworkProject[];
    disabled: boolean;
}) {
    if (projects.length === 0) {
        return null;
    }

    return (
        <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                {title}
                <Badge variant="secondary" className="tabular-nums">
                    {projects.length}
                </Badge>
            </h3>
            <div className="flex flex-col gap-2">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                    >
                        <Switch
                            checked={project.enabled}
                            disabled={disabled}
                            onCheckedChange={(checked) => {
                                router.patch(
                                    `/teamwork/projects/${project.id}`,
                                    { enabled: checked === true },
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                    },
                                );
                            }}
                            aria-label={`${project.enabled ? "Deactivate" : "Activate"} ${project.name}`}
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <FolderKanbanIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">
                                {project.name}
                            </span>
                        </div>
                        {project.url !== null && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                nativeButton={false}
                                render={
                                    <a
                                        href={project.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={`Open ${project.name} in Teamwork`}
                                    />
                                }
                            >
                                <ExternalLinkIcon />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
