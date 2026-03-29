import { useEffect, useState } from "react";
import type { UserSettings } from "@get-steady/core";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";

export function SettingsScreen({
  dataPath,
  exportDirectory,
  backupDirectory,
  settings,
  onSaveSettings,
  onExportEntries,
  onExportDebts,
  onBackup,
}: {
  dataPath: string;
  exportDirectory: string;
  backupDirectory: string;
  settings: UserSettings;
  onSaveSettings: (input: UserSettings) => Promise<void> | void;
  onExportEntries: () => Promise<void> | void;
  onExportDebts: () => Promise<void> | void;
  onBackup: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  async function persist(next: UserSettings) {
    setDraft(next);
    await onSaveSettings(next);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="rounded-[32px] border border-border/80 bg-card/95 p-6 shadow-card">
          <Badge>Settings</Badge>
          <h1 className="mt-3 font-display text-4xl text-foreground">Local, visible, portable.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Tune habit support, keep your data portable, and make the app feel calmer to return to
            each day.
          </p>
        </div>
        <Card className="border-primary/10 bg-slate-950 text-slate-50 shadow-[0_20px_48px_rgba(23,34,46,0.24)]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300/85">Trust notes</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-300">Ownership</p>
              <p className="mt-1 text-sm leading-6 text-white">
                Exports and backups stay explicit and visible.
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Reminder style</p>
              <p className="mt-1 text-sm leading-6 text-white">
                Reminders should nudge, not scold.
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Boundaries</p>
              <p className="mt-1 text-sm leading-6 text-white">
                Developer integrations remain outside this user-facing area.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground">Habit support</h2>
            <p className="text-sm text-muted-foreground">
              These controls should reduce friction and support recovery, not create maintenance
              work.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-[22px] border border-border bg-muted/35 px-4 py-4 text-sm">
              <input
                checked={draft.remindersEnabled}
                type="checkbox"
                onChange={(event) =>
                  void persist({
                    ...draft,
                    remindersEnabled: event.target.checked,
                  })
                }
              />
              Enable reminders
            </label>
            <div className="rounded-[22px] border border-border bg-muted/25 p-4">
              <Label htmlFor="reminder-time">Daily reminder time</Label>
              <Input
                className="mt-3"
                id="reminder-time"
                type="time"
                value={draft.reminderTime}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, reminderTime: event.target.value }))
                }
                onBlur={() => void persist(draft)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-[22px] border border-border bg-muted/35 px-4 py-4 text-sm">
              <input
                checked={draft.catchUpReminderEnabled}
                type="checkbox"
                onChange={(event) =>
                  void persist({
                    ...draft,
                    catchUpReminderEnabled: event.target.checked,
                  })
                }
              />
              Catch-up reminder
            </label>
            <label className="flex items-center gap-3 rounded-[22px] border border-border bg-muted/35 px-4 py-4 text-sm">
              <input
                checked={draft.debtDueReminderEnabled}
                type="checkbox"
                onChange={(event) =>
                  void persist({
                    ...draft,
                    debtDueReminderEnabled: event.target.checked,
                  })
                }
              />
              Debt due reminder
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-border bg-muted/25 p-4">
              <Label htmlFor="default-view">Default landing screen</Label>
              <Select
                className="mt-3"
                id="default-view"
                value={draft.defaultView}
                onChange={(event) =>
                  void persist({
                    ...draft,
                    defaultView: event.target.value as UserSettings["defaultView"],
                  })
                }
              >
                <option value="today">Today</option>
                <option value="calendar">Calendar</option>
                <option value="ledger">Ledger</option>
                <option value="debts">Debts</option>
                <option value="analytics">Analytics</option>
                <option value="settings">Settings</option>
              </Select>
            </div>
            <div className="rounded-[22px] border border-border bg-muted/25 p-4">
              <Label htmlFor="theme-mode">Theme mode</Label>
              <Select
                className="mt-3"
                id="theme-mode"
                value={draft.themeMode}
                onChange={(event) =>
                  void persist({
                    ...draft,
                    themeMode: event.target.value as UserSettings["themeMode"],
                  })
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-border bg-muted/25 p-4">
              <Label htmlFor="catch-up-prompt-mode">Catch-up prompt mode</Label>
              <Select
                className="mt-3"
                id="catch-up-prompt-mode"
                value={draft.catchUpPromptMode}
                onChange={(event) =>
                  void persist({
                    ...draft,
                    catchUpPromptMode: event.target.value as UserSettings["catchUpPromptMode"],
                  })
                }
              >
                <option value="always">Always visible</option>
                <option value="when_missed">Only when missed</option>
                <option value="hidden">Hide prompts</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground">Storage</h2>
            <p className="text-sm text-muted-foreground">
              Your local database path stays visible because ownership should feel concrete.
            </p>
          </div>
          <code className="rounded-[22px] border border-border bg-muted/35 px-4 py-4 text-sm text-foreground">
            {dataPath}
          </code>
          <p className="text-xs text-muted-foreground">
            Developer settings and integrations remain intentionally separate from this user-facing
            settings area.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground">Export</h2>
            <p className="text-sm text-muted-foreground">
              Take readable copies of your data whenever you want.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Default export directory: {exportDirectory}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void onExportEntries()}>Export entries CSV</Button>
            <Button variant="secondary" onClick={() => void onExportDebts()}>
              Export debts CSV
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            XLSX is intentionally deferred for the first slice.
          </p>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground">Backups</h2>
            <p className="text-sm text-muted-foreground">
              Quiet safety rails matter more than clever automation.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Default backup directory: {backupDirectory}
          </p>
          <Button onClick={() => void onBackup()}>Create database backup</Button>
          <p className="text-xs text-muted-foreground">
            Restore/import UI remains deferred while the habit loop is being strengthened.
          </p>
        </Card>
      </div>
    </div>
  );
}
