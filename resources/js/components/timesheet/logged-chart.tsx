import {
    CalendarDaysIcon,
    CalendarRangeIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FlagIcon,
} from "lucide-react";
import { useId, useMemo, type MouseEvent, type MouseEventHandler } from "react";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";
import {
    AbsenceIcon,
    absencePartLabel,
} from "@/components/timesheet/absence-kind";
import { TeamworkLogo } from "@/components/timesheet/teamwork-logo";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    ChartContainer,
    ChartTooltip,
    type ChartConfig,
} from "@/components/ui/chart";
import { formatDuration, todayInLisbon } from "@/lib/timesheet";
import type { Holiday } from "@/types/holiday";
import type { AbsencePart } from "@/types/time-off";
import type { TimesheetDay } from "@/types/timesheet";

const FULL_DAY = 8 * 60;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const;

const chartConfig = {
    minutes: {
        label: "Logged",
        color: "var(--color-tw-pink)",
    },
} satisfies ChartConfig;

type ChartPoint = {
    date: string;
    label: string;
    weekday: string;
    day: string;
    month: string;
    minutes: number;
    billable: number;
    nonBillable: number;
    weekend: boolean;
    today: boolean;
    absence: {
        kind: string;
        label: string;
        part: AbsencePart;
    } | null;
    holiday: string | null;
};

type ColumnShapeProps = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    payload?: ChartPoint;
    background?: { x?: number; y?: number; width?: number; height?: number };
    patternId: string;
    scale: number;
    onMouseEnter?: MouseEventHandler<SVGElement>;
    onMouseLeave?: MouseEventHandler<SVGElement>;
    onClick?: MouseEventHandler<SVGElement>;
};

type Span = "week" | "month";

export function LoggedChart({
    days,
    holidays,
    from,
    to,
    onNavigate,
}: {
    days: TimesheetDay[];
    holidays: Holiday[];
    from: string;
    to: string;
    onNavigate: (query: Record<string, string>) => void;
}) {
    const patternId = `weekend-${useId().replaceAll(":", "")}`;
    const points = useMemo(
        () => chartPoints(days, holidays, from, to),
        [days, holidays, from, to],
    );
    const byDate = useMemo(
        () => new Map(points.map((day) => [day.date, day])),
        [points],
    );
    const total = points.reduce((sum, day) => sum + day.minutes, 0);
    const scale = Math.max(FULL_DAY, ...points.map((day) => day.minutes), 0);
    const compact = points.length > 14;
    const span = spanOf(from, to);

    return (
        <Card size="sm" className="-mx-4 rounded-none ring-0">
            <CardHeader className="border-b items-center">
                <CardTitle className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-5xl mx-auto">
                    <div className="flex items-center gap-2 ">
                        <ToggleGroup
                            variant="outline"
                            size="sm"
                            spacing={0}
                            value={[span]}
                            onValueChange={(value) => {
                                const next = value.at(-1);

                                if (
                                    (next === "week" || next === "month") &&
                                    next !== span
                                ) {
                                    onNavigate(spanQuery(from, to, next));
                                }
                            }}
                        >
                            <ToggleGroupItem value="week">
                                <CalendarRangeIcon
                                    className="size-4"
                                    strokeWidth={1.75}
                                />
                                Week
                            </ToggleGroupItem>
                            <ToggleGroupItem value="month">
                                <CalendarDaysIcon
                                    className="size-4"
                                    strokeWidth={1.75}
                                />
                                Month
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={
                                span === "month"
                                    ? "Previous month"
                                    : "Previous week"
                            }
                            onClick={() =>
                                onNavigate(shiftQuery(from, span, -1))
                            }
                        >
                            <ChevronLeftIcon />
                        </Button>
                        <span className="min-w-36 text-center">
                            {periodTitle(from, to, span)}
                        </span>
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={
                                span === "month" ? "Next month" : "Next week"
                            }
                            onClick={() =>
                                onNavigate(shiftQuery(from, span, 1))
                            }
                        >
                            <ChevronRightIcon />
                        </Button>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate(todayQuery(span))}
                        >
                            <div className="rounded-full size-2 bg-tw-orange" />
                            Today
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-60 w-full"
                >
                    <BarChart
                        accessibilityLayer
                        data={points}
                        margin={{ top: 16, right: 28, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <pattern
                                id={patternId}
                                width="8"
                                height="8"
                                patternUnits="userSpaceOnUse"
                                patternTransform="rotate(45)"
                            >
                                <rect
                                    width="8"
                                    height="8"
                                    fill="var(--muted)"
                                />
                                <line
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="8"
                                    stroke="var(--muted-foreground)"
                                    strokeOpacity="0.45"
                                    strokeWidth="3"
                                />
                            </pattern>
                        </defs>
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={6}
                            interval={0}
                            height={compact ? 64 : 48}
                            tick={(props) => (
                                <DayTick
                                    x={props.x}
                                    y={props.y}
                                    compact={compact}
                                    point={byDate.get(
                                        String(props.payload.value),
                                    )}
                                    onSelect={scrollToDay}
                                />
                            )}
                        />
                        <YAxis hide domain={[0, scale]} width={0} />
                        <ChartTooltip cursor={false} content={LoggedTooltip} />
                        <ReferenceLine
                            y={FULL_DAY}
                            stroke="var(--border)"
                            strokeDasharray="4 4"
                            label={{
                                value: "8h",
                                position: "right",
                                fontSize: 10,
                                fill: "var(--muted-foreground)",
                            }}
                        />
                        <Bar
                            dataKey="minutes"
                            shape={(props: ColumnShapeProps) => (
                                <ColumnShape
                                    {...props}
                                    patternId={patternId}
                                    scale={scale}
                                />
                            )}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="border-b">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground max-w-5xl mx-auto">
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm bg-tw-pink" />
                        Billable
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm bg-tw-indigo" />
                        Non-billable
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm bg-tw-purple" />
                        Time off
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm bg-tw-violet" />
                        Holiday
                    </span>
                </div>
            </CardFooter>
        </Card>
    );
}

function chartPoints(
    days: TimesheetDay[],
    holidays: Holiday[],
    from: string,
    to: string,
): ChartPoint[] {
    const logged = new Map(days.map((day) => [day.date, splitLogged(day)]));
    const absences = new Map(
        days.map((day) => [day.date, chartAbsence(day.absence)]),
    );
    const holidayNames = new Map(
        holidays.map((holiday) => [holiday.date, holiday.name]),
    );
    const dates = eachDate(from, to);

    if (dates.length === 0) {
        return [...days]
            .reverse()
            .map((day) =>
                point(
                    day.date,
                    splitLogged(day),
                    chartAbsence(day.absence),
                    holidayNames.get(day.date) ?? null,
                ),
            );
    }

    return dates.map((date) =>
        point(
            date,
            logged.get(date) ?? emptyLogged(),
            absences.get(date) ?? null,
            holidayNames.get(date) ?? null,
        ),
    );
}

function chartAbsence(
    absence: TimesheetDay["absence"] | undefined,
): ChartPoint["absence"] {
    if (absence == null) {
        return null;
    }

    const part =
        absence.part === "morning" || absence.part === "afternoon"
            ? absence.part
            : "day";

    return { kind: absence.kind, label: absence.label, part };
}

function splitLogged(day: TimesheetDay): LoggedSplit {
    let billable = 0;
    let nonBillable = 0;

    for (const entry of day.logged) {
        if (entry.billable) {
            billable += entry.minutes;
        } else {
            nonBillable += entry.minutes;
        }
    }

    return { minutes: billable + nonBillable, billable, nonBillable };
}

function emptyLogged(): LoggedSplit {
    return { minutes: 0, billable: 0, nonBillable: 0 };
}

function LoggedTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload?: ChartPoint }>;
}) {
    const row = payload?.[0]?.payload;

    if (!active || row === undefined) {
        return null;
    }

    const amounts = [
        row.billable > 0
            ? { label: "Billable", minutes: row.billable, color: "bg-tw-pink" }
            : null,
        row.nonBillable > 0
            ? {
                  label: "Non-billable",
                  minutes: row.nonBillable,
                  color: "bg-tw-indigo",
              }
            : null,
    ].filter((amount) => amount !== null);

    return (
        <div className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="font-medium">{row.label}</div>
            <div className="grid gap-1">
                {row.holiday !== null && (
                    <span className="flex items-center gap-1.5 font-medium">
                        <FlagIcon className="size-3.5 text-tw-violet" />
                        {row.holiday}
                    </span>
                )}
                {row.absence && (
                    <span className="flex items-center gap-1.5 font-medium">
                        <AbsenceIcon
                            kind={row.absence.kind}
                            className="size-3.5 text-tw-purple"
                        />
                        {row.absence.label}
                        {absencePartLabel(row.absence.part)
                            ? ` · ${absencePartLabel(row.absence.part)}`
                            : ""}
                    </span>
                )}
                {amounts.map((amount) => (
                    <span
                        key={amount.label}
                        className="flex items-center gap-1.5 font-medium tabular-nums"
                    >
                        <span
                            className={`size-2 shrink-0 rounded-full ${amount.color}`}
                            role="img"
                            aria-label={amount.label}
                        />
                        {formatDuration(amount.minutes)}
                    </span>
                ))}
            </div>
        </div>
    );
}

function point(
    date: string,
    logged: LoggedSplit,
    absence: ChartPoint["absence"],
    holiday: string | null,
): ChartPoint {
    const parsed = localDate(date);
    const weekday = WEEKDAYS[parsed.getDay()];
    const day = String(parsed.getDate());
    const month = MONTHS[parsed.getMonth()];

    return {
        date,
        label: `${weekday} ${day} ${month}`,
        weekday,
        day,
        month,
        minutes: logged.minutes,
        billable: logged.billable,
        nonBillable: logged.nonBillable,
        weekend: parsed.getDay() === 0 || parsed.getDay() === 6,
        today: date === todayInLisbon(),
        absence,
        holiday,
    };
}

function eachDate(from: string, to: string): string[] {
    if (!isIsoDate(from) || !isIsoDate(to)) {
        return [];
    }

    const dates: string[] = [];
    const cursor = localDate(from);
    const end = localDate(to).getTime();

    while (cursor.getTime() <= end) {
        dates.push(isoDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}

function isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function localDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function spanOf(from: string, to: string): Span {
    const start = localDate(from);
    const end = localDate(to);
    const lastDay = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
    ).getDate();

    if (
        start.getDate() === 1 &&
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        end.getDate() === lastDay
    ) {
        return "month";
    }

    return "week";
}

function todayQuery(span: Span): Record<string, string> {
    return { preset: span === "month" ? "month" : "week" };
}

function spanQuery(
    from: string,
    to: string,
    span: Span,
): Record<string, string> {
    if (span === "month") {
        return shiftQuery(from, "month", 0);
    }

    const today = todayInLisbon();
    const anchor = today >= from && today <= to ? today : from;

    return shiftQuery(anchor, "week", 0);
}

function shiftQuery(
    from: string,
    span: Span,
    delta: number,
): Record<string, string> {
    if (span === "month") {
        const parsed = localDate(from);
        const start = new Date(
            parsed.getFullYear(),
            parsed.getMonth() + delta,
            1,
        );
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

        return namedPeriod(isoDate(start), isoDate(end), "month");
    }

    const start = startOfWeek(localDate(from));
    start.setDate(start.getDate() + delta * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return namedPeriod(isoDate(start), isoDate(end), "week");
}

function namedPeriod(
    nextFrom: string,
    nextTo: string,
    span: Span,
): Record<string, string> {
    const today = localDate(todayInLisbon());

    if (span === "month") {
        const thisStart = isoDate(
            new Date(today.getFullYear(), today.getMonth(), 1),
        );
        const thisEnd = isoDate(
            new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
        const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        if (nextFrom === thisStart && nextTo === thisEnd) {
            return { preset: "month" };
        }

        if (
            nextFrom === isoDate(previous) &&
            nextTo ===
                isoDate(
                    new Date(
                        previous.getFullYear(),
                        previous.getMonth() + 1,
                        0,
                    ),
                )
        ) {
            return { preset: "last-month" };
        }
    } else {
        const thisStart = startOfWeek(today);
        const thisEnd = new Date(thisStart);
        thisEnd.setDate(thisStart.getDate() + 6);
        const previousStart = new Date(thisStart);
        previousStart.setDate(thisStart.getDate() - 7);
        const previousEnd = new Date(previousStart);
        previousEnd.setDate(previousStart.getDate() + 6);

        if (nextFrom === isoDate(thisStart) && nextTo === isoDate(thisEnd)) {
            return { preset: "week" };
        }

        if (
            nextFrom === isoDate(previousStart) &&
            nextTo === isoDate(previousEnd)
        ) {
            return { preset: "last-week" };
        }
    }

    return { preset: "custom", from: nextFrom, to: nextTo };
}

function startOfWeek(date: Date): Date {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const offset = start.getDay() === 0 ? -6 : 1 - start.getDay();
    start.setDate(start.getDate() + offset);

    return start;
}

function periodTitle(from: string, to: string, span: Span): string {
    if (span === "month") {
        return localDate(from).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
        });
    }

    const start = localDate(from);
    const end = localDate(to);
    const sameMonth =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth();

    if (sameMonth) {
        return `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
    }

    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

function isoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
}

function absenceBar(
    column: { x: number; y: number; width: number; height: number },
    part: AbsencePart,
    scale: number,
): { x: number; y: number; width: number; height: number } {
    if (part === "day" || scale <= 0) {
        return column;
    }

    const dayHeight = (FULL_DAY / scale) * column.height;
    const half = dayHeight / 2;

    return {
        x: column.x,
        y: column.y + column.height - (part === "morning" ? half : dayHeight),
        width: column.width,
        height: half,
    };
}

function scrollToDay(date: string | undefined): void {
    if (date === undefined) {
        return;
    }

    document.getElementById(`day-${date}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
    window.dispatchEvent(
        new CustomEvent("timesheet:reveal-day", { detail: date }),
    );
}

type LoggedSplit = {
    minutes: number;
    billable: number;
    nonBillable: number;
};

function ColumnShape({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    background,
    patternId,
    scale = FULL_DAY,
    onMouseEnter,
    onMouseLeave,
    onClick,
}: ColumnShapeProps) {
    const select = (event: MouseEvent<SVGElement>) => {
        onClick?.(event);
        scrollToDay(payload?.date);
    };
    const events = {
        onMouseEnter,
        onMouseLeave,
        onClick: select,
    };
    const minutes = payload?.minutes ?? 0;
    const nonBillable = payload?.nonBillable ?? 0;
    const nonBillableHeight =
        minutes > 0 ? (height * nonBillable) / minutes : 0;
    const billableHeight = Math.max(0, height - nonBillableHeight);
    const billableFill = "var(--color-tw-pink)";
    const slot =
        background?.width && background.height
            ? {
                  x: background.x,
                  y: background.y,
                  width: background.width,
                  height: background.height,
              }
            : null;
    const column =
        slot === null
            ? null
            : width > 0
              ? { x, y: slot.y, width, height: slot.height }
              : slot;
    const holiday = Boolean(payload?.holiday) && column;
    const weekend = Boolean(payload?.weekend) && !holiday && column;
    const absence = Boolean(payload?.absence) && !payload?.weekend && column;
    const absenceFrame =
        absence && column
            ? absenceBar(column, payload?.absence?.part ?? "day", scale)
            : null;

    return (
        <g className="cursor-pointer">
            {slot ? (
                <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.width}
                    height={slot.height}
                    fill="transparent"
                    onClick={select}
                />
            ) : null}
            {holiday && column && (
                <rect
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={3}
                    fill="color-mix(in oklab, var(--color-tw-violet) 18%, transparent)"
                    {...events}
                />
            )}
            {absence && absenceFrame && (
                <rect
                    x={absenceFrame.x}
                    y={absenceFrame.y}
                    width={absenceFrame.width}
                    height={absenceFrame.height}
                    rx={3}
                    fill="color-mix(in oklab, var(--color-tw-purple) 10%, transparent)"
                    {...events}
                />
            )}
            {weekend && column && (
                <rect
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={3}
                    fill={`url(#${patternId})`}
                    {...events}
                />
            )}
            {billableHeight > 0 &&
                (nonBillableHeight > 0 ? (
                    <rect
                        x={x}
                        y={y + nonBillableHeight}
                        width={width}
                        height={billableHeight}
                        fill={billableFill}
                        {...events}
                    />
                ) : (
                    <TopBar
                        x={x}
                        y={y}
                        width={width}
                        height={billableHeight}
                        fill={billableFill}
                        {...events}
                    />
                ))}
            {nonBillableHeight > 0 && (
                <TopBar
                    x={x}
                    y={y}
                    width={width}
                    height={nonBillableHeight}
                    fill="var(--color-tw-indigo)"
                    {...events}
                />
            )}
            {holiday && column && (
                <rect
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={3}
                    fill="none"
                    stroke="var(--color-tw-violet)"
                    strokeWidth={1}
                    pointerEvents="none"
                />
            )}
            {holiday && column && (
                <FlagIcon
                    x={column.x + (column.width - 12) / 2}
                    y={column.y + column.height - 16}
                    width={12}
                    height={12}
                    aria-label={payload?.holiday ?? "Holiday"}
                    className="pointer-events-none text-tw-violet"
                />
            )}
            {absence && absenceFrame && (
                <rect
                    x={absenceFrame.x}
                    y={absenceFrame.y}
                    width={absenceFrame.width}
                    height={absenceFrame.height}
                    rx={3}
                    fill="none"
                    stroke="var(--color-tw-purple)"
                    strokeWidth={1}
                    pointerEvents="none"
                />
            )}
            {absence && absenceFrame && payload?.absence && (
                <AbsenceIcon
                    kind={payload.absence.kind}
                    x={absenceFrame.x + (absenceFrame.width - 12) / 2}
                    y={absenceFrame.y + absenceFrame.height - 16}
                    width={12}
                    height={12}
                    aria-hidden
                    className="pointer-events-none text-tw-purple"
                />
            )}
        </g>
    );
}

function TopBar({
    x,
    y,
    width,
    height,
    fill,
    onMouseEnter,
    onMouseLeave,
    onClick,
}: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    onMouseEnter?: MouseEventHandler<SVGElement>;
    onMouseLeave?: MouseEventHandler<SVGElement>;
    onClick?: MouseEventHandler<SVGElement>;
}) {
    const radius = Math.min(3, width / 2, height);
    const path = [
        `M ${x} ${y + height}`,
        `L ${x} ${y + radius}`,
        `Q ${x} ${y} ${x + radius} ${y}`,
        `L ${x + width - radius} ${y}`,
        `Q ${x + width} ${y} ${x + width} ${y + radius}`,
        `L ${x + width} ${y + height}`,
        "Z",
    ].join(" ");

    return (
        <path
            d={path}
            fill={fill}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
        />
    );
}

function DayTick({
    x = 0,
    y = 0,
    point,
    compact = false,
    onSelect,
}: {
    x?: number | string;
    y?: number | string;
    point?: ChartPoint;
    compact?: boolean;
    onSelect: (date: string) => void;
}) {
    const over = (point?.minutes ?? 0) > FULL_DAY;
    const left = Number(x);
    const top = Number(y);
    const labelEnd = compact ? 33 : 23;

    return (
        <g
            className="cursor-pointer"
            onClick={() => {
                if (point !== undefined) {
                    onSelect(point.date);
                }
            }}
        >
            {over && (
                <g
                    transform={`translate(${left}, ${top + labelEnd + 12})`}
                    aria-label="More than 8 hours"
                >
                    <title>More than 8 hours</title>
                    <path
                        d="M0,-6.5 L5.2,3.2 L-5.2,3.2 Z"
                        className="fill-red-600"
                    />
                    <path
                        d="M-0.7,-2.4 h1.4 v3.1 h-1.4 Z M-0.7,1.5 h1.4 v1.4 h-1.4 Z"
                        className="fill-white"
                    />
                </g>
            )}
            <text
                x={x}
                y={y}
                textAnchor="middle"
                className={
                    point?.today
                        ? "fill-tw-orange text-[10px] font-bold"
                        : point?.holiday
                          ? "fill-tw-violet text-[10px] font-medium"
                          : point?.absence
                            ? "fill-tw-purple text-[10px] font-medium"
                            : "fill-muted-foreground text-[10px]"
                }
            >
                <tspan
                    x={x}
                    dy={11}
                    className={point?.today ? "font-bold" : "font-medium"}
                >
                    {point?.weekday}
                </tspan>
                {compact ? (
                    <>
                        <tspan x={x} dy={11}>
                            {point?.day}
                        </tspan>
                        <tspan x={x} dy={11}>
                            {point?.month}
                        </tspan>
                    </>
                ) : (
                    <tspan x={x} dy={12}>
                        {point ? `${point.day} ${point.month}` : ""}
                    </tspan>
                )}
            </text>
        </g>
    );
}
