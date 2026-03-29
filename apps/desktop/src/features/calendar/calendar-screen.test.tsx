import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarScreen } from "./calendar-screen";

describe("CalendarScreen", () => {
  it("shows recovery context and opens a selected missed day", () => {
    const onJumpToDate = vi.fn();
    const onMarkPartial = vi.fn();

    render(
      <CalendarScreen
        month="2026-03"
        selectedDate={null}
        calendar={{
          month: "2026-03",
          recovery: {
            oldestMissedDate: "2026-03-25",
            missedCount: 1,
          },
          days: [
            {
              date: "2026-03-24",
              state: "complete",
              moneyIn: 200,
              moneyOut: 50,
              net: 150,
              hasEntries: true,
              hasDebtPayment: false,
              hasDueMarker: false,
            },
            {
              date: "2026-03-25",
              state: "missed",
              moneyIn: 0,
              moneyOut: 0,
              net: 0,
              hasEntries: false,
              hasDebtPayment: false,
              hasDueMarker: false,
            },
          ],
          grid: [
            {
              kind: "day",
              key: "2026-03-24",
              day: {
                date: "2026-03-24",
                state: "complete",
                moneyIn: 200,
                moneyOut: 50,
                net: 150,
                hasEntries: true,
                hasDebtPayment: false,
                hasDueMarker: false,
              },
            },
            {
              kind: "day",
              key: "2026-03-25",
              day: {
                date: "2026-03-25",
                state: "missed",
                moneyIn: 0,
                moneyOut: 0,
                net: 0,
                hasEntries: false,
                hasDebtPayment: false,
                hasDueMarker: false,
              },
            },
          ],
        }}
        onChangeMonth={vi.fn()}
        onJumpToDate={onJumpToDate}
        onMarkPartial={onMarkPartial}
      />,
    );

    expect(screen.getByText("Recovery lane")).toBeInTheDocument();
    expect(screen.getByText("Oldest missed day")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "25" }));
    expect(screen.getByRole("heading", { name: "Mar 25, 2026" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Catch up this day"));
    expect(onJumpToDate).toHaveBeenCalledWith("2026-03-25");
  });

  it("renders spacer cells before the first clickable day in a shifted month", () => {
    render(
      <CalendarScreen
        month="2026-04"
        selectedDate={null}
        calendar={{
          month: "2026-04",
          recovery: {
            oldestMissedDate: null,
            missedCount: 0,
          },
          days: [
            {
              date: "2026-04-01",
              state: "missed",
              moneyIn: 0,
              moneyOut: 0,
              net: 0,
              hasEntries: false,
              hasDebtPayment: false,
              hasDueMarker: false,
            },
          ],
          grid: [
            { kind: "spacer", key: "leading-0" },
            { kind: "spacer", key: "leading-1" },
            { kind: "spacer", key: "leading-2" },
            {
              kind: "day",
              key: "2026-04-01",
              day: {
                date: "2026-04-01",
                state: "missed",
                moneyIn: 0,
                moneyOut: 0,
                net: 0,
                hasEntries: false,
                hasDebtPayment: false,
                hasDueMarker: false,
              },
            },
          ],
        }}
        onChangeMonth={vi.fn()}
        onJumpToDate={vi.fn()}
        onMarkPartial={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getAllByText("Sun")).toHaveLength(1);
  });
});
