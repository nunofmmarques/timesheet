import herdLogo from "@/assets/herd.png";
import reactNativeLogo from "@/assets/react-native.svg";

export function folderMark(path: string, roots: string[]) {
    const root = roots
        .toSorted((left, right) => right.length - left.length)
        .find(
            (candidate) =>
                path === candidate || path.startsWith(`${candidate}/`),
        );
    const name = root?.split("/").filter(Boolean).at(-1);

    if (name === "Herd") {
        return { label: "Herd", icon: herdLogo };
    }

    if (name === "_APPS_PROJECTS") {
        return { label: "Mobile App", icon: reactNativeLogo };
    }

    return null;
}

export function FolderMark({
    path,
    roots,
    hideLabel = false,
}: {
    path: string;
    roots: string[];
    hideLabel?: boolean;
}) {
    const mark = folderMark(path, roots);

    if (mark === null) {
        return (
            <div className="truncate text-xs text-muted-foreground">{path}</div>
        );
    }

    return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <img src={mark.icon} alt="" className="size-3.5 shrink-0" />
            {!hideLabel && mark.label}
        </div>
    );
}
