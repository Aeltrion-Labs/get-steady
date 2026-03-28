import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("./lib/api", async () => {
  const actual = await vi.importActual<typeof import("./lib/api")>("./lib/api");
  return {
    ...actual,
    bootstrapApp: vi.fn(async () => ({
      dataPath: "C:\\steady.sqlite",
      backupDirectory: "C:\\backups",
      exportDirectory: "C:\\exports",
      categories: [
        { id: "cat-income", name: "Income", type: "income" },
        { id: "cat-groceries", name: "Groceries", type: "expense" },
      ],
      entries: [],
      debts: [],
      checkIns: [],
      onboarding: {
        hasCompletedOnboarding: false,
        dailyCheckInTime: "19:00",
        remindersEnabled: true,
      },
      settings: {
        defaultView: "today",
        remindersEnabled: true,
        reminderTime: "19:00",
        reminderDays: [0, 1, 2, 3, 4, 5, 6],
        catchUpReminderEnabled: true,
        debtDueReminderEnabled: true,
        quietHoursStart: "21:30",
        quietHoursEnd: "08:00",
        weekendRemindersEnabled: true,
        catchUpPromptMode: "when_missed",
        showAdvancedOptions: false,
      },
    })),
    saveOnboarding: vi.fn(async () => undefined),
  };
});

describe("App", () => {
  it("shows onboarding before the main shell for a first-run user", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Own your money habit")).toBeInTheDocument();
    });

    expect(screen.queryByText("A calmer daily money habit.")).not.toBeInTheDocument();
  });
});
