import { PencilIcon, Trash2Icon } from "lucide-react";
import {
    cloneElement,
    isValidElement,
    useEffect,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SheetItemActions({ children }: { children: ReactNode }) {
    return (
        <div className="flex shrink-0 items-center gap-0.5">{children}</div>
    );
}

export function SheetEditButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={label}
            onClick={onClick}
        >
            <PencilIcon />
        </Button>
    );
}

export function ConfirmDeleteButton({
    label,
    idleLabel = "Delete",
    confirmLabel = "Confirm delete",
    labeled = false,
    icon,
    disabled = false,
    busy = false,
    className,
    onConfirm,
}: {
    label: string;
    idleLabel?: string;
    confirmLabel?: string;
    labeled?: boolean;
    icon?: ReactNode;
    disabled?: boolean;
    busy?: boolean;
    className?: string;
    onConfirm: () => void;
}) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [confirming, setConfirming] = useState(false);
    const showLabel = labeled || confirming;
    const glyph = icon ?? <Trash2Icon />;

    useEffect(() => {
        if (disabled || busy) {
            setConfirming(false);
        }
    }, [busy, disabled]);

    useEffect(() => {
        if (!confirming) {
            return;
        }

        function onPointerDown(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                buttonRef.current?.contains(event.target)
            ) {
                return;
            }

            setConfirming(false);
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== "Escape") {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            setConfirming(false);
        }

        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKeyDown, true);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown, true);
        };
    }, [confirming]);

    return (
        <Button
            ref={buttonRef}
            type="button"
            size={showLabel ? (labeled ? "default" : "sm") : "icon-sm"}
            variant={confirming || labeled ? "destructive" : "ghost"}
            className={className}
            aria-label={confirming ? confirmLabel : label}
            disabled={disabled || busy}
            onClick={() => {
                if (!confirming) {
                    setConfirming(true);

                    return;
                }

                onConfirm();
            }}
        >
            {busy ? (
                <Spinner data-icon="inline-start" />
            ) : showLabel ? (
                markIcon(glyph)
            ) : (
                glyph
            )}
            {showLabel && (confirming ? confirmLabel : idleLabel)}
        </Button>
    );
}

function markIcon(icon: ReactNode) {
    if (!isValidElement(icon)) {
        return icon;
    }

    return cloneElement(icon as ReactElement<{ "data-icon"?: string }>, {
        "data-icon": "inline-start",
    });
}
