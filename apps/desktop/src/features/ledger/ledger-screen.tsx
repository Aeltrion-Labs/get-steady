import { useState } from "react";
import type { Category, Debt, Entry } from "@get-steady/core";
import type { EntryInput } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { formatCurrency, formatShortDate } from "../../lib/utils";
import { EntryForm } from "../shared/entry-form";

export function LedgerScreen({
  entries,
  categories,
  debts,
  defaultDate,
  onSaveEntry,
  onDeleteEntry,
}: {
  entries: Entry[];
  categories: Category[];
  debts: Debt[];
  defaultDate: string;
  onSaveEntry: (input: EntryInput) => Promise<void> | void;
  onDeleteEntry: (entryId: string) => Promise<void> | void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: "all",
    categoryId: "",
    startDate: "",
    endDate: "",
  });

  const filteredEntries = entries.filter((entry) => {
    if (filters.type !== "all" && entry.type !== filters.type) {
      return false;
    }
    if (filters.categoryId && entry.categoryId !== filters.categoryId) {
      return false;
    }
    if (filters.startDate && entry.entryDate < filters.startDate) {
      return false;
    }
    if (filters.endDate && entry.entryDate > filters.endDate) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border bg-card/90 p-6 shadow-panel lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>History</Badge>
          <h1 className="mt-3 font-display text-4xl text-foreground">
            Every entry stays editable.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Backdate it, fix it, or delete it. Daily tracking only works if correction stays easy.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm((current) => !current)}>
          {showCreateForm ? "Close form" : "Add entry"}
        </Button>
      </div>

      {showCreateForm ? (
        <Card>
          <EntryForm
            categories={categories}
            debts={debts}
            initialDate={defaultDate}
            submitLabel="Create entry"
            onSubmit={async (input) => {
              await onSaveEntry(input);
              setShowCreateForm(false);
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="ledger-type">Type</Label>
            <Select
              id="ledger-type"
              value={filters.type}
              onChange={(event) =>
                setFilters((current) => ({ ...current, type: event.target.value }))
              }
            >
              <option value="all">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="debt_payment">Debt payment</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ledger-category">Category</Label>
            <Select
              id="ledger-category"
              value={filters.categoryId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, categoryId: event.target.value }))
              }
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ledger-start">From</Label>
            <Input
              id="ledger-start"
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="ledger-end">To</Label>
            <Input
              id="ledger-end"
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((current) => ({ ...current, endDate: event.target.value }))
              }
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>{entry.type.replace("_", " ")}</Badge>
                  <h2 className="text-lg font-semibold text-foreground">
                    {formatCurrency(entry.amount)}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatShortDate(entry.entryDate)}
                  {entry.note ? ` • ${entry.note}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setEditingEntryId(entry.id)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("Delete this entry?")) {
                      void onDeleteEntry(entry.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>

            {editingEntryId === entry.id ? (
              <EntryForm
                categories={categories}
                debts={debts}
                initialDate={entry.entryDate}
                initialEntry={entry}
                submitLabel="Save changes"
                onSubmit={async (input) => {
                  await onSaveEntry(input);
                  setEditingEntryId(null);
                }}
                onCancel={() => setEditingEntryId(null)}
              />
            ) : null}
          </Card>
        ))}

        {filteredEntries.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No entries match the current filters.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
