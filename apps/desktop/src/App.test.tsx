import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { queryClient } from "./lib/query-client";

const bootstrapAppMock = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("./lib/api", async () => {
  const actual = await vi.importActual<typeof import("./lib/api")>("./lib/api");
  return {
    ...actual,
    bootstrapApp: (...args: Parameters<typeof actual.bootstrapApp>) => bootstrapAppMock(...args),
    saveOnboarding: vi.fn(async () => undefined),
    saveSettings: vi.fn(async (input) => input),
  };
});

type MatchMediaController = {
  emit: (matches: boolean) => void;
};

function installMatchMedia(initialMatches: boolean): MatchMediaController {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let matches = initialMatches;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    })),
  });

  return {
    emit(nextMatches: boolean) {
      matches = nextMatches;
      const event = {
        matches: nextMatches,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function bootstrapPayload(overrides?: Partial<Awaited<ReturnType<typeof bootstrapAppMock>>>) {
  return {
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
      dailyReviewMode: "simple",
    },
    settings: {
      defaultView: "today",
      themeMode: "system",
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
    ...overrides,
  };
}

describe("App", () => {
  beforeEach(() => {
    bootstrapAppMock.mockReset();
    queryClient.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows onboarding before the main shell for a first-run user", async () => {
    installMatchMedia(false);
    bootstrapAppMock.mockResolvedValue(bootstrapPayload());

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Own your money habit")).toBeInTheDocument();
    });

    expect(screen.queryByText("A calmer daily money habit.")).not.toBeInTheDocument();
  });

  it("follows the system theme when theme mode is system", async () => {
    installMatchMedia(true);
    bootstrapAppMock.mockResolvedValue(bootstrapPayload());

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });

  it("honors a manual light override even when the system is dark", async () => {
    installMatchMedia(true);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        settings: {
          ...bootstrapPayload().settings,
          themeMode: "light",
        },
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  it("updates the effective theme when the system theme changes in system mode", async () => {
    const media = installMatchMedia(false);
    bootstrapAppMock.mockResolvedValue(bootstrapPayload());

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    act(() => {
      media.emit(true);
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });
});
