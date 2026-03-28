import { useState } from "react";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { calculateTodaySummary, getMissedCheckInDates } from "@get-steady/core";
import { ArrowDownCircle, BookOpenText, CircleDollarSign, House, Settings2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { DebtsScreen } from "./features/debts/debts-screen";
import { LedgerScreen } from "./features/ledger/ledger-screen";
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
} from "./lib/api";
import { queryClient } from "./lib/query-client";
import { cn, formatCurrency, todayIsoDate } from "./lib/utils";

type View = "today" | "ledger" | "debts" | "settings";

const NAV_ITEMS = [
  { id: "today" as const, label: "Today", icon: House },
  { id: "ledger" as const, label: "Ledger", icon: BookOpenText },
  { id: "debts" as const, label: "Debts", icon: ArrowDownCircle },
  { id: "settings" as const, label: "Settings", icon: Settings2 },
];

function AppInner() {
  const [currentView, setCurrentView] = useState<View>("today");
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
          <h1 className="mt-4 font-display text-3xl text-foreground">The app could not finish booting.</h1>
          <p className="mt-3 text-sm text-muted-foreground">{String(bootstrapQuery.error ?? "Unknown bootstrap failure.")}</p>
          <Button className="mt-6" onClick={() => void bootstrapQuery.refetch()}>
            Retry bootstrap
          </Button>
        </div>
      </div>
    );
  }

  const data = bootstrapQuery.data;
  const summary = calculateTodaySummary({
    entries: data.entries,
    debts: data.debts,
    checkIns: data.checkIns,
    today,
  });
  const missedDates = getMissedCheckInDates(data.checkIns, today);

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
    const destination = await chooseDestination(`${data.backupDirectory}\\steady-backup-${today}.sqlite`);
    if (!destination) return;
    await createBackup(destination);
    toast.success("Backup created.");
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1480px] gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="rounded-[36px] border border-border bg-card/90 p-6 shadow-card">
          <Badge>Get Steady</Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight text-foreground">A calmer daily money habit.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Local-first, manual by design, and built to make a daily check-in feel brief instead of burdensome.
          </p>

          <div className="mt-8 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition",
                    active ? "bg-primary text-white" : "bg-white/70 text-foreground hover:bg-muted",
                  )}
                  onClick={() => setCurrentView(item.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-[28px] border border-border bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">This month</p>
            <div className="mt-3 flex items-center gap-3">
              <CircleDollarSign className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Net margin</p>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(summary.monthNetMargin)}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          {currentView === "today" ? (
            <TodayScreen
              today={today}
              summary={summary}
              categories={data.categories}
              debts={data.debts}
              missedDates={missedDates}
              onQuickAdd={async (input) => {
                await saveEntryMutation.mutateAsync(input);
              }}
              onMarkTodayComplete={async () => {
                await markCheckInMutation.mutateAsync({ date: today, isPartial: false, note: null });
              }}
              onMarkDatePartial={async (date) => {
                await markCheckInMutation.mutateAsync({ date, isPartial: true, note: "Catch-up partial." });
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

          {currentView === "settings" ? (
            <SettingsScreen
              dataPath={data.dataPath}
              exportDirectory={data.exportDirectory}
              backupDirectory={data.backupDirectory}
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
