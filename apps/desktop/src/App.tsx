import { useEffect, useState } from "react";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import {
  buildCalendarMonth,
  calculateAnalyticsSummary,
  calculateTodaySummary,
  evaluateReminderPlan,
  getMissedCheckInDates,
  type AppView,
  type ThemeMode,
} from "@get-steady/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  ArrowDownCircle,
  BookOpenText,
  CalendarDays,
  ChartColumnIncreasing,
  CircleDollarSign,
  Dot,
  House,
  Settings2,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { AnalyticsScreen } from "./features/analytics/analytics-screen";
import { CalendarScreen } from "./features/calendar/calendar-screen";
import { DebtsScreen } from "./features/debts/debts-screen";
import { LedgerScreen } from "./features/ledger/ledger-screen";
import { OnboardingFlow } from "./features/onboarding/onboarding-flow";
import { SettingsScreen } from "./features/settings/settings-screen";
import { TodayScreen } from "./features/today/today-screen";
import {
  bootstrapApp,
  createBackup,
  deleteDebt,
  deleteEntry,
  exportDebtsCsv,
  exportEntriesCsv,
  markCheckIn,
  recordDebtPayment,
  saveDebt,
  saveEntry,
  saveOnboarding,
  saveSettings,
} from "./lib/api";
import { queryClient } from "./lib/query-client";
import { cn, formatCurrency, todayIsoDate } from "./lib/utils";

const NAV_ITEMS = [
  { id: "today" as const, label: "Today", icon: House },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { id: "ledger" as const, label: "Ledger", icon: BookOpenText },
  { id: "debts" as const, label: "Debts", icon: ArrowDownCircle },
  { id: "analytics" as const, label: "Analytics", icon: ChartColumnIncreasing },
  { id: "settings" as const, label: "Settings", icon: Settings2 },
];

const VIEW_META: Record<AppView, { eyebrow: string; title: string; description: string }> = {
  today: {
    eyebrow: "Daily habit",
    title: "Today stays at the center.",
    description:
      "Log the money movement that matters, then close the loop before tomorrow asks for your attention.",
  },
  calendar: {
    eyebrow: "Recovery view",
    title: "Catch up without shame.",
    description:
      "Use the month view to spot missed days quickly and move them back into the habit rhythm.",
  },
  ledger: {
    eyebrow: "Entry history",
    title: "Review the trail cleanly.",
    description:
      "See what came in, what went out, and keep the record honest without overcomplicating the workflow.",
  },
  debts: {
    eyebrow: "Debt focus",
    title: "Make balances visible.",
    description:
      "Keep your debt picture current so cashflow decisions are grounded in what is still owed.",
  },
  analytics: {
    eyebrow: "Mission view",
    title: "See whether the habit is working.",
    description:
      "Use the analytics view to judge progress toward debt freedom and cashflow stability without falling into dashboard sprawl.",
  },
  settings: {
    eyebrow: "Control center",
    title: "Keep the app under your control.",
    description:
      "Adjust reminders, exports, and local-first preferences without cluttering the daily workflow.",
  },
};

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light" as const;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function AppInner() {
  const [currentView, setCurrentView] = useState<AppView>("today");
  const [selectedEntryDate, setSelectedEntryDate] = useState(todayIsoDate());
  const [calendarMonth, setCalendarMonth] = useState(todayIsoDate().slice(0, 7));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [defaultViewApplied, setDefaultViewApplied] = useState(false);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme());
  const today = todayIsoDate();

  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: bootstrapApp,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  const saveEntryMutation = useMutation({
    mutationFn: saveEntry,
    onSuccess: async () => {
      toast.success("Entry saved.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: deleteEntry,
    onSuccess: async () => {
      toast.success("Entry deleted.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const saveDebtMutation = useMutation({
    mutationFn: saveDebt,
    onSuccess: async () => {
      toast.success("Debt saved.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const deleteDebtMutation = useMutation({
    mutationFn: deleteDebt,
    onSuccess: async () => {
      toast.success("Debt deleted.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: recordDebtPayment,
    onSuccess: async () => {
      toast.success("Debt payment recorded.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const markCheckInMutation = useMutation({
    mutationFn: markCheckIn,
    onSuccess: async (_, input) => {
      toast.success(input.isPartial ? "Day marked partial." : "Check-in saved.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const saveOnboardingMutation = useMutation({
    mutationFn: saveOnboarding,
    onSuccess: async () => {
      toast.success("You are ready for today.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: async () => {
      toast.success("Settings saved.");
      await refresh();
    },
    onError: (error) => toast.error(String(error)),
  });

  useEffect(() => {
    if (!defaultViewApplied && bootstrapQuery.data?.settings) {
      setCurrentView(bootstrapQuery.data.settings.defaultView);
      setDefaultViewApplied(true);
    }
  }, [bootstrapQuery.data, defaultViewApplied]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = (event?: MediaQueryListEvent) => {
      setSystemTheme((event?.matches ?? mediaQuery.matches) ? "dark" : "light");
    };

    syncTheme();
    mediaQuery.addEventListener?.("change", syncTheme);
    mediaQuery.addListener?.(syncTheme);

    return () => {
      mediaQuery.removeEventListener?.("change", syncTheme);
      mediaQuery.removeListener?.(syncTheme);
    };
  }, []);

  const themeMode: ThemeMode = bootstrapQuery.data?.settings.themeMode ?? "system";
  const effectiveTheme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
  }, [effectiveTheme]);

  if (bootstrapQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-[32px] border border-border bg-card/95 p-10 shadow-card">
          <p className="font-display text-3xl text-foreground">Loading your local ledger...</p>
        </div>
      </div>
    );
  }

  if (bootstrapQuery.error || !bootstrapQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-xl rounded-[32px] border border-destructive/20 bg-card p-10 shadow-card">
          <Badge>Error</Badge>
          <h1 className="mt-4 font-display text-3xl text-foreground">
            The app could not finish booting.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {String(bootstrapQuery.error ?? "Unknown bootstrap failure.")}
          </p>
          <Button className="mt-6" onClick={() => void bootstrapQuery.refetch()}>
            Retry bootstrap
          </Button>
        </div>
      </div>
    );
  }

  const data = bootstrapQuery.data;

  if (!data.onboarding.hasCompletedOnboarding) {
    return (
      <>
        <OnboardingFlow
          categories={data.categories}
          onComplete={async (input) => {
            await saveOnboardingMutation.mutateAsync({
              dailyCheckInTime: input.dailyCheckInTime,
              remindersEnabled: input.remindersEnabled,
              selectedCategoryIds: input.selectedCategoryIds,
              dailyReviewMode: "simple",
            });
          }}
          onSkip={async () => {
            await saveOnboardingMutation.mutateAsync({
              dailyCheckInTime: data.onboarding.dailyCheckInTime ?? "19:00",
              remindersEnabled: data.onboarding.remindersEnabled,
              selectedCategoryIds: [],
              dailyReviewMode: data.onboarding.dailyReviewMode,
            });
          }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  const summary = calculateTodaySummary({
    entries: data.entries,
    debts: data.debts,
    checkIns: data.checkIns,
    today,
  });
  const analyticsSummary = calculateAnalyticsSummary({
    entries: data.entries,
    debts: data.debts,
    checkIns: data.checkIns,
    today,
  });
  const missedDates = getMissedCheckInDates(data.checkIns, today);
  const calendar = buildCalendarMonth({
    month: calendarMonth,
    today,
    entries: data.entries,
    debts: data.debts,
    checkIns: data.checkIns,
  });
  const reminderPlan = evaluateReminderPlan({
    now: new Date().toISOString(),
    today,
    settings: data.settings,
    checkIns: data.checkIns,
    debts: data.debts,
    deliveryHistory: {
      dailyCheckIn: [],
      catchUpGentleNudge: [],
      debtDueSoon: [],
    },
  });
  const showCatchUp =
    data.settings.catchUpPromptMode === "always" ||
    (data.settings.catchUpPromptMode === "when_missed" && missedDates.length > 0);
  const activeViewMeta = VIEW_META[currentView];
  const topStatusLabel = reminderPlan.dailyCheckIn?.shouldSend
    ? "Reminder eligible now"
    : "Calm local reminders";

  async function chooseDestination(defaultPath: string) {
    const selected = await save({ defaultPath });
    return selected ?? null;
  }

  async function handleExportEntries() {
    const destination = await chooseDestination(`${data.exportDirectory}\\entries-${today}.csv`);
    if (!destination) return;
    await exportEntriesCsv(destination);
    toast.success("Entries CSV exported.");
  }

  async function handleExportDebts() {
    const destination = await chooseDestination(`${data.exportDirectory}\\debts-${today}.csv`);
    if (!destination) return;
    await exportDebtsCsv(destination);
    toast.success("Debts CSV exported.");
  }

  async function handleBackup() {
    const destination = await chooseDestination(
      `${data.backupDirectory}\\steady-backup-${today}.sqlite`,
    );
    if (!destination) return;
    await createBackup(destination);
    toast.success("Backup created.");
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1480px] gap-6 lg:grid-cols-[300px,1fr]">
        <aside className="flex flex-col rounded-[36px] border border-border bg-card/90 p-6 shadow-card">
          <div className="rounded-[28px] border border-border/80 bg-gradient-to-br from-slate-950 via-slate-900 to-primary px-5 py-5 text-white">
            <Badge className="border-white/15 bg-white/10 text-slate-200">Get Steady</Badge>
            <h1 className="mt-4 font-display text-4xl leading-tight text-white">
              A calmer daily money habit.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Local-first, manual by design, and built to make a daily check-in feel brief instead
              of burdensome.
            </p>
          </div>

          <div className="mt-8">
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Navigation
            </p>
            <div className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active
                        ? "border-primary/15 bg-primary text-white shadow-sm"
                        : "border-transparent bg-card/70 text-foreground hover:border-border hover:bg-muted/85",
                    )}
                    onClick={() => setCurrentView(item.id)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                    {active ? <Dot className="ml-auto h-5 w-5" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-border bg-card/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">This month</p>
            <div className="mt-3 flex items-center gap-3">
              <CircleDollarSign className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Net margin</p>
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {formatCurrency(summary.monthNetMargin)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {reminderPlan.dailyCheckIn?.shouldSend
                ? "A reminder would be eligible right now."
                : "Reminder timing stays calm and local-first."}
            </p>
          </div>

          <div className="mt-4 rounded-[28px] border border-border/80 bg-muted/45 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Current posture
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between rounded-[20px] bg-card/75 px-3 py-3">
                <span className="text-sm text-muted-foreground">Missed days</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {missedDates.length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[20px] bg-card/75 px-3 py-3">
                <span className="text-sm text-muted-foreground">Debt outstanding</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatCurrency(summary.debtOutstanding)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="rounded-[24px] border border-border/80 bg-accent/45 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-primary/80">
                {topStatusLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {reminderPlan.dailyCheckIn?.shouldSend
                  ? "If you were relying on reminders, today would be a good moment for one."
                  : "The app stays quiet unless it can help you act on the day."}
              </p>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="rounded-[30px] border border-border bg-card/85 px-5 py-4 shadow-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {activeViewMeta.eyebrow}
                </p>
                <h2 className="mt-2 font-display text-3xl text-foreground">
                  {activeViewMeta.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {activeViewMeta.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
                <div className="rounded-[22px] border border-border/80 bg-card/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Today</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{today}</p>
                </div>
                <div className="rounded-[22px] border border-border/80 bg-card/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Check-in
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {summary.isTodayCheckedIn ? "Closed out" : "Open"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/80 bg-card/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Reminder time
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {data.settings.reminderTime}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/80 bg-card/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Theme</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-foreground">
                    {themeMode === "system" ? `System (${effectiveTheme})` : themeMode}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {currentView === "today" ? (
            <TodayScreen
              today={today}
              summary={summary}
              categories={data.categories}
              debts={data.debts}
              missedDates={missedDates}
              activeEntryDate={selectedEntryDate}
              showCatchUp={showCatchUp}
              onQuickAdd={async (input) => {
                await saveEntryMutation.mutateAsync(input);
              }}
              onSelectEntryDate={(date) => setSelectedEntryDate(date)}
              onMarkTodayComplete={async () => {
                await markCheckInMutation.mutateAsync({
                  date: today,
                  isPartial: false,
                  note: null,
                });
              }}
              onMarkDatePartial={async (date) => {
                await markCheckInMutation.mutateAsync({
                  date,
                  isPartial: true,
                  note: "Catch-up partial.",
                });
              }}
            />
          ) : null}

          {currentView === "calendar" ? (
            <CalendarScreen
              month={calendarMonth}
              selectedDate={selectedCalendarDate}
              calendar={calendar}
              onChangeMonth={(month) => {
                setCalendarMonth(month);
                setSelectedCalendarDate(null);
              }}
              onJumpToDate={(date) => {
                setSelectedEntryDate(date);
                setSelectedCalendarDate(date);
                setCalendarMonth(date.slice(0, 7));
                setCurrentView("today");
              }}
              onMarkPartial={async (date) => {
                await markCheckInMutation.mutateAsync({
                  date,
                  isPartial: true,
                  note: "Catch-up partial.",
                });
              }}
            />
          ) : null}

          {currentView === "ledger" ? (
            <LedgerScreen
              entries={data.entries}
              categories={data.categories}
              debts={data.debts}
              defaultDate={today}
              onSaveEntry={async (input) => {
                await saveEntryMutation.mutateAsync(input);
              }}
              onDeleteEntry={async (entryId) => {
                await deleteEntryMutation.mutateAsync(entryId);
              }}
            />
          ) : null}

          {currentView === "debts" ? (
            <DebtsScreen
              debts={data.debts}
              defaultDate={today}
              onSaveDebt={async (input) => {
                await saveDebtMutation.mutateAsync(input);
              }}
              onDeleteDebt={async (debtId) => {
                await deleteDebtMutation.mutateAsync(debtId);
              }}
              onRecordPayment={async (input) => {
                await recordPaymentMutation.mutateAsync(input);
              }}
            />
          ) : null}

          {currentView === "analytics" ? <AnalyticsScreen summary={analyticsSummary} /> : null}

          {currentView === "settings" ? (
            <SettingsScreen
              dataPath={data.dataPath}
              exportDirectory={data.exportDirectory}
              backupDirectory={data.backupDirectory}
              settings={data.settings}
              onSaveSettings={async (input) => {
                await saveSettingsMutation.mutateAsync(input);
              }}
              onExportEntries={handleExportEntries}
              onExportDebts={handleExportDebts}
              onBackup={handleBackup}
            />
          ) : null}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
