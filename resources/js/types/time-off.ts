export type AbsencePart = "day" | "morning" | "afternoon";

export type TimeOff = {
    id: number;
    kind: string;
    part: AbsencePart;
    label: string;
    note: string;
    startsOn: string;
    endsOn: string;
};

export type DayAbsence = {
    id: number;
    kind: string;
    part: AbsencePart;
    label: string;
    note: string;
};
