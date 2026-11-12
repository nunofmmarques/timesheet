import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useId, useMemo, type MouseEvent, type MouseEventHandler } from "react";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { AbsenceIcon } from "@/components/timesheet/absence-kind";
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
    absence: { kind: string; label: string } | null;
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
    onMouseEnter?: MouseEventHandler<SVGElement>;
    onMouseLeave?: MouseEventHandler<SVGElement>;
    onClick?: MouseEventHandler<SVGElement>;
};

type Span = "week" | "month";

export function LoggedChart({
    days,
    from,
    to,
    onNavigate,
}: {
    days: TimesheetDay[];
    from: string;
    to: string;
    onNavigate: (query: Record<string, string>) => void;
}) {
    const patternId = `weekend-${useId().replaceAll(":", "")}`;
    const points = useMemo(() => chartPoints(days, from, to), [days, from, to]);
    const byDate = useMemo(
        () => new Map(points.map((day) => [day.date, day])),
        [points],
    );
    const total = points.reduce((sum, day) => sum + day.minutes, 0);
    const scale = Math.max(FULL_DAY, ...points.map((day) => day.minutes), 0);
    const compact = points.length > 14;
    const span = spanOf(from, to);

    return (
        <Card size="sm" className="-mx-4 rounded-none">
            <CardHeader className="border-b items-center">
                <CardTitle className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-5xl mx-auto">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <TeamworkLogo />
                        Teamwork
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
                            <ToggleGroupItem value="week">Week</ToggleGroupItem>
                            <ToggleGroupItem value="month">
                                Month
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate(todayQuery(span))}
                        >
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
                            <pattern
                                id={`${patternId}-lines`}
                                width="8"
                                height="8"
                                patternUnits="userSpaceOnUse"
                                patternTransform="rotate(45)"
                            >
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
                            height={compact ? 46 : 40}
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
                                <ColumnShape {...props} patternId={patternId} />
                            )}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
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
                        <span className="size-2 rounded-sm bg-tw-orange" />
                        Today
                    </span>
                </div>
            </CardFooter>
        </Card>
    );
}

function chartPoints(
    days: TimesheetDay[],
    from: string,
    to: string,
): ChartPoint[] {
    const logged = new Map(days.map((day) => [day.date, splitLogged(day)]));
    const absences = new Map(
        days.map((day) => [
            day.date,
            day.absence
                ? { kind: day.absence.kind, label: day.absence.label }
                : null,
        ]),
    );
    const dates = eachDate(from, to);

    if (dates.length === 0) {
        return [...days]
            .reverse()
            .map((day) =>
                point(
                    day.date,
                    splitLogged(day),
                    day.absence
                        ? { kind: day.absence.kind, label: day.absence.label }
                        : null,
                ),
            );
    }

    return dates.map((date) =>
        point(
            date,
            logged.get(date) ?? emptyLogged(),
            absences.get(date) ?? null,
        ),
    );
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
                {row.absence && (
                    <span className="flex items-center gap-1.5 font-medium">
                        <AbsenceIcon
                            kind={row.absence.kind}
                            className="size-3.5 text-tw-purple"
                        />
                        {row.absence.label}
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
    absence: { kind: string; label: string } | null,
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

function scrollToDay(date: string | undefined): void {
    if (date === undefined) {
        return;
    }

    document.getElementById(`day-${date}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
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
    const weekend = Boolean(payload?.weekend) && column;
    const today = payload?.today === true;
    const absence = Boolean(payload?.absence) && column;

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
            {today && !absence && column && (
                <rect
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={3}
                    fill="color-mix(in oklab, var(--color-tw-orange) 16%, transparent)"
                    pointerEvents="none"
                />
            )}
            {absence && column && (
                <rect
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={3}
                    fill="color-mix(in oklab, var(--color-tw-purple) 10%, transparent)"
                    {...events}
                />
            )}
            {weekend && !absence && column && (
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
            {weekend && absence && column && (
                <rect
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={3}
                    fill={`url(#${patternId}-lines)`}
                    pointerEvents="none"
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
            {(today || absence) && column && (
                <rect
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={3}
                    fill="none"
                    stroke={
                        today
                            ? "var(--color-tw-orange)"
                            : "var(--color-tw-purple)"
                    }
                    strokeWidth={1}
                    pointerEvents="none"
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
    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            className={
                point?.today
                    ? "cursor-pointer fill-tw-orange text-[10px] font-medium"
                    : point?.absence
                      ? "cursor-pointer fill-tw-purple text-[10px] font-medium"
                      : "cursor-pointer fill-muted-foreground text-[10px]"
            }
            onClick={() => {
                if (point !== undefined) {
                    onSelect(point.date);
                }
            }}
        >
            <tspan x={x} dy={11} className="font-medium">
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
    );
}
