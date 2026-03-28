import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

export function SettingsScreen({
  dataPath,
  exportDirectory,
  backupDirectory,
  onExportEntries,
  onExportDebts,
  onBackup,
}: {
  dataPath: string;
  exportDirectory: string;
  backupDirectory: string;
  onExportEntries: () => Promise<void> | void;
  onExportDebts: () => Promise<void> | void;
  onBackup: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-border bg-card/90 p-6 shadow-card">
        <Badge>Settings</Badge>
        <h1 className="mt-3 font-display text-4xl text-foreground">Local, visible, portable.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The file path is visible, exports are plain CSV, and backups stay on your machine.
        </p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-2xl text-foreground">Storage</h2>
        <p className="text-sm text-muted-foreground">SQLite database path</p>
        <code className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-foreground">{dataPath}</code>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display text-2xl text-foreground">Export</h2>
          <p className="text-sm text-muted-foreground">Default export directory: {exportDirectory}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void onExportEntries()}>Export entries CSV</Button>
            <Button variant="secondary" onClick={() => void onExportDebts()}>
              Export debts CSV
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">XLSX is intentionally deferred for the first slice.</p>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-2xl text-foreground">Backups</h2>
          <p className="text-sm text-muted-foreground">Default backup directory: {backupDirectory}</p>
          <Button onClick={() => void onBackup()}>Create database backup</Button>
          <p className="text-xs text-muted-foreground">Restore/import UI is deferred to keep the MVP focused.</p>
        </Card>
      </div>

      <Card className="space-y-2">
        <h2 className="font-display text-2xl text-foreground">Reminder placeholder</h2>
        <p className="text-sm text-muted-foreground">
          Native reminders are deferred. This card marks the settings boundary for a later notification pass.
        </p>
      </Card>
    </div>
  );
}
