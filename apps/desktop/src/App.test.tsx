import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { queryClient } from "./lib/query-client";

const bootstrapAppMock = vi.fn();
const runAutomaticBackupMock = vi.fn();
const openPathMock = vi.fn();
const restoreBackupMock = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: (...args: unknown[]) => openPathMock(...args),
}));

vi.mock("./lib/api", async () => {
  const actual = await vi.importActual<typeof import("./lib/api")>("./lib/api");
  return {
    ...actual,
    bootstrapApp: (...args: Parameters<typeof actual.bootstrapApp>) => bootstrapAppMock(...args),
    runAutomaticBackup: (...args: Parameters<typeof actual.runAutomaticBackup>) =>
      runAutomaticBackupMock(...args),
    restoreBackup: (...args: Parameters<typeof actual.restoreBackup>) => restoreBackupMock(...args),
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
      selectedCategoryIds: [],
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
    backupSummary: {
      lastSuccessfulAutomaticBackupAt: null,
      nextAutomaticBackupDueAt: null,
      retentionPolicy: "7 daily, 4 weekly, 6 monthly",
    },
    backups: [],
    ...overrides,
  };
}

describe("App", () => {
  beforeEach(() => {
    bootstrapAppMock.mockReset();
    runAutomaticBackupMock.mockReset();
    runAutomaticBackupMock.mockResolvedValue(null);
    openPathMock.mockReset();
    restoreBackupMock.mockReset();
    restoreBackupMock.mockResolvedValue(undefined);
    vi.restoreAllMocks();
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
      expect(screen.getByText("Get steady with your money")).toBeInTheDocument();
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

  it("runs an automatic backup on startup when the rolling window is due", async () => {
    installMatchMedia(false);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
        },
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(runAutomaticBackupMock).toHaveBeenCalledTimes(1);
    });
  });

  it("does not run an automatic backup on startup when the rolling window is not due", async () => {
    installMatchMedia(false);
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
        },
        backupSummary: {
          lastSuccessfulAutomaticBackupAt: "2026-03-28T12:00:00Z",
          nextAutomaticBackupDueAt: oneHourFromNow,
          retentionPolicy: "7 daily, 4 weekly, 6 monthly",
        },
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    });

    expect(runAutomaticBackupMock).not.toHaveBeenCalled();
  });

  it("shows backup management details in settings", async () => {
    installMatchMedia(false);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
        },
        backupSummary: {
          lastSuccessfulAutomaticBackupAt: "2026-03-27T12:00:00Z",
          nextAutomaticBackupDueAt: "2026-03-28T12:00:00Z",
          retentionPolicy: "7 daily, 4 weekly, 6 monthly",
        },
        backups: [
          {
            id: "backup-1",
            kind: "auto",
            status: "success",
            filePath: "C:\\backups\\steady-auto-20260327-120000.sqlite",
            fileName: "steady-auto-20260327-120000.sqlite",
            createdAt: "2026-03-27T12:00:00Z",
            completedAt: "2026-03-27T12:00:10Z",
            sizeBytes: 2048,
            errorMessage: null,
            triggeredBy: "scheduler",
          },
        ],
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByRole("button", { name: "Settings" }).click();
    });

    expect(screen.getByText("Backup management")).toBeInTheDocument();
    expect(screen.getByText("Retention: 7 daily, 4 weekly, 6 monthly")).toBeInTheDocument();
    expect(screen.getByText("steady-auto-20260327-120000.sqlite")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create backup now" })).toBeInTheDocument();
  });

  it("reveals the backup folder from settings", async () => {
    installMatchMedia(false);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
        },
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Reveal backup folder" }));

    expect(openPathMock).toHaveBeenCalledWith("C:\\backups");
  });

  it("prioritizes onboarding-selected categories in today quick add", async () => {
    installMatchMedia(false);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        categories: [
          { id: "cat-income", name: "Income", type: "income" },
          { id: "cat-dining", name: "Dining", type: "expense" },
          { id: "cat-groceries", name: "Groceries", type: "expense" },
          { id: "cat-gas", name: "Gas", type: "expense" },
        ],
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
          selectedCategoryIds: ["cat-groceries", "cat-gas"],
        },
      }),
    );

    render(<App />);

    const categorySelect = (await screen.findByLabelText("Category")) as HTMLSelectElement;
    const optionLabels = Array.from(categorySelect.options).map((option) => option.text);

    expect(optionLabels).toEqual(["Select category", "Groceries", "Gas", "Dining"]);
  });

  it("disables restore for failed backups in settings", async () => {
    installMatchMedia(false);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
        },
        backups: [
          {
            id: "backup-failed",
            kind: "auto",
            status: "failed",
            filePath: "C:\\backups\\broken.sqlite",
            fileName: "broken.sqlite",
            createdAt: "2026-03-27T12:00:00Z",
            completedAt: "2026-03-27T12:00:10Z",
            sizeBytes: null,
            errorMessage: "disk full",
            triggeredBy: "scheduler",
          },
        ],
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByText("disk full")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore backup" })).toBeDisabled();
  });

  it("asks for confirmation before restoring and does not restore when cancelled", async () => {
    installMatchMedia(false);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
        },
        backups: [
          {
            id: "backup-ok",
            kind: "manual",
            status: "success",
            filePath: "C:\\backups\\manual.sqlite",
            fileName: "manual.sqlite",
            createdAt: "2026-03-27T12:00:00Z",
            completedAt: "2026-03-27T12:00:10Z",
            sizeBytes: 1024,
            errorMessage: null,
            triggeredBy: "user",
          },
        ],
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore backup" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(restoreBackupMock).not.toHaveBeenCalled();
  });

  it("calls restore after explicit confirmation", async () => {
    installMatchMedia(false);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    bootstrapAppMock.mockResolvedValue(
      bootstrapPayload({
        onboarding: {
          ...bootstrapPayload().onboarding,
          hasCompletedOnboarding: true,
        },
        backups: [
          {
            id: "backup-ok",
            kind: "manual",
            status: "success",
            filePath: "C:\\backups\\manual.sqlite",
            fileName: "manual.sqlite",
            createdAt: "2026-03-27T12:00:00Z",
            completedAt: "2026-03-27T12:00:10Z",
            sizeBytes: 1024,
            errorMessage: null,
            triggeredBy: "user",
          },
        ],
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore backup" }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(restoreBackupMock).toHaveBeenCalledWith("backup-ok", expect.any(Object));
    });
  });
});
