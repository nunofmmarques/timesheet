import {
    BabyIcon,
    BanknoteIcon,
    CalendarOffIcon,
    HeartHandshakeIcon,
    ThermometerIcon,
    TreePalmIcon,
    type LucideIcon,
    type LucideProps,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
    vacation: TreePalmIcon,
    paid_leave: BanknoteIcon,
    parental: BabyIcon,
    sick: ThermometerIcon,
    family_assistance: HeartHandshakeIcon,
    other: CalendarOffIcon,
};

export function absencePartLabel(part: string): string | null {
    if (part === "morning") {
        return "Morning";
    }

    if (part === "afternoon") {
        return "Afternoon";
    }

    return null;
}

export function AbsenceIcon({
    kind,
    ...props
}: { kind: string } & LucideProps) {
    const Icon = ICONS[kind] ?? CalendarOffIcon;

    return <Icon {...props} />;
}
