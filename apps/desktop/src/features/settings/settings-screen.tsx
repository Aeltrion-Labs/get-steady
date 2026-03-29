import { useEffect, useState } from "react";
import type { UserSettings } from "@get-steady/core";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import type { BackupRecord, BackupSummary } from "../../lib/api";

function formatBackupTime(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBackupSize(sizeBytes: number | null) {
  if (!sizeBytes || sizeBytes <= 0) return "Pending";
  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupKind(kind: BackupRecord["kind"]) {
  if (kind === "pre-restore") return "Pre-restore";
  return kind.slice(0, 1).toUpperCase() + kind.slice(1);
}

export function SettingsScreen({
  dataPath,
  exportDirectory,
  backupDirectory,
  settings,
  backupSummary,
  backups,
  isRestoringBackup,
  onSaveSettings,
  onExportEntries,
  onExportDebts,
  onCreateBackup,
  onRestoreBackup,
  onRevealBackupFolder,
}: {
  dataPath: string;
  exportDirectory: string;
  backupDirectory: string;
  settings: UserSettings;
  backupSummary: BackupSummary;
  backups: BackupRecord[];
  isRestoringBackup: boolean;
  onSaveSettings: (input: UserSettings) => Promise<void> | void;
  onExportEntries: () => Promise<void> | void;
  onExportDebts: () => Promise<void> | void;
  onCreateBackup: () => Promise<void> | void;
  onRestoreBackup: (backupId: string) => Promise<void> | void;
  onRevealBackupFolder: () => Promise<void> | void;
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
      <div className="rounded-[32px] border border-border/80 bg-card/95 p-6 shadow-panel">
        <Badge>Settings</Badge>
        <h1 className="mt-3 font-display text-4xl text-foreground">Local, visible, portable.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Tune habit support, keep your data portable, and make the app feel calmer to return to
          each day.
        </p>
      </div>

      <div className="grid gap-4">
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
                <option value="ledger">History</option>
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
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground">Export</h2>
            <p className="text-sm text-muted-foreground">
              Take readable copies of your data whenever you want.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Storage: {dataPath}</p>
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
            <h2 className="font-display text-2xl text-foreground">Backup management</h2>
            <p className="text-sm text-muted-foreground">
              Automatic recovery points stay quiet until they are needed. Restore is cautious on
              purpose.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-border bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Last automatic backup
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatBackupTime(backupSummary.lastSuccessfulAutomaticBackupAt)}
              </p>
            </div>
            <div className="rounded-[22px] border border-border bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Next automatic backup due
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatBackupTime(backupSummary.nextAutomaticBackupDueAt)}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Default backup directory: {backupDirectory}
          </p>
          <p className="text-sm text-muted-foreground">
            Retention: {backupSummary.retentionPolicy}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void onCreateBackup()}>Create backup now</Button>
            <Button variant="secondary" onClick={() => void onRevealBackupFolder()}>
              Reveal backup folder
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Available backups</h3>
              <p className="text-xs text-muted-foreground">
                Successful backups can be restored after a safety snapshot of your current database
                is created.
              </p>
            </div>
            {backups.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No backups exist yet. The app will create one automatically when the rolling 24-hour
                window is due, or you can trigger one now.
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => {
                  const isRestorable = backup.status === "success" && !isRestoringBackup;
                  return (
                    <div
                      key={backup.id}
                      className="rounded-[22px] border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {backup.fileName}
                            </span>
                            <Badge>{formatBackupKind(backup.kind)}</Badge>
                            <Badge
                              className={
                                backup.status === "success"
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
                              }
                            >
                              {backup.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created {formatBackupTime(backup.createdAt)} •{" "}
                            {formatBackupSize(backup.sizeBytes)} • {backup.triggeredBy}
                          </p>
                          {backup.errorMessage ? (
                            <p className="text-sm text-destructive">{backup.errorMessage}</p>
                          ) : null}
                        </div>
                        <Button
                          disabled={!isRestorable}
                          variant="secondary"
                          onClick={() => void onRestoreBackup(backup.id)}
                        >
                          Restore backup
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
