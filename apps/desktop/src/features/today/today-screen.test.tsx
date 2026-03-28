import { render, screen } from "@testing-library/react";
import { TodayScreen } from "./today-screen";

describe("TodayScreen", () => {
  it("shows the summary and catch-up prompt", () => {
    render(
      <TodayScreen
        today="2026-03-27"
        summary={{
          todayMoneyIn: 200,
          todayMoneyOut: 50,
          monthMoneyIn: 1000,
          monthMoneyOut: 650,
          monthNetMargin: 350,
          debtOutstanding: 1200,
          missedCheckInDaysCount: 2,
          isTodayCheckedIn: false,
        }}
        categories={[]}
        debts={[]}
        missedDates={["2026-03-24", "2026-03-25"]}
        activeEntryDate="2026-03-27"
        showCatchUp
        onQuickAdd={async () => {}}
        onSelectEntryDate={() => {}}
        onMarkTodayComplete={async () => {}}
        onMarkDatePartial={async () => {}}
      />,
    );

    expect(screen.getByText("Today money in")).toBeInTheDocument();
    expect(screen.getByText("Catch up")).toBeInTheDocument();
    expect(screen.getByText("Mar 24, 2026")).toBeInTheDocument();
  });
});
