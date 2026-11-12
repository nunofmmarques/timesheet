import {
    BabyIcon,
    BanknoteIcon,
    CalendarOffIcon,
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
    other: CalendarOffIcon,
};

export function AbsenceIcon({
    kind,
    ...props
}: { kind: string } & LucideProps) {
    const Icon = ICONS[kind] ?? CalendarOffIcon;

    return <Icon {...props} />;
}
