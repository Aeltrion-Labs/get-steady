import { useState } from "react";
import { z } from "zod";
import type { Category, Debt, Entry } from "@get-steady/core";
import type { EntryInput } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";

const entryFormSchema = z
  .object({
    type: z.enum(["income", "expense", "debt_payment"]),
    amount: z.coerce.number().positive("Amount must be greater than zero."),
    categoryId: z.string().nullable(),
    debtId: z.string().nullable(),
    note: z.string().optional(),
    entryDate: z.string().min(1, "Date is required."),
    isEstimated: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if ((value.type === "income" || value.type === "expense") && !value.categoryId) {
      ctx.addIssue({ code: "custom", message: "Choose a category.", path: ["categoryId"] });
    }

    if (value.type === "debt_payment" && !value.debtId) {
      ctx.addIssue({ code: "custom", message: "Choose a debt account.", path: ["debtId"] });
    }
  });

type EntryFormValues = {
  type: "income" | "expense" | "debt_payment";
  amount: string;
  categoryId: string;
  debtId: string;
  note: string;
  entryDate: string;
  isEstimated: boolean;
};

export function EntryForm({
  categories,
  debts,
  initialDate,
  initialEntry,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  categories: Category[];
  debts: Debt[];
  initialDate: string;
  initialEntry?: Entry;
  submitLabel: string;
  onSubmit: (input: EntryInput) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<EntryFormValues>({
    type: initialEntry?.type ?? "expense",
    amount: initialEntry ? String(initialEntry.amount) : "",
    categoryId: initialEntry?.categoryId ?? "",
    debtId: initialEntry?.debtId ?? "",
    note: initialEntry?.note ?? "",
    entryDate: initialEntry?.entryDate ?? initialDate,
    isEstimated: initialEntry?.isEstimated ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = categories.filter((category) => {
    if (values.type === "income") {
      return category.type === "income" || category.type === "both";
    }

    return category.type === "expense" || category.type === "both";
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = entryFormSchema.safeParse({
      ...values,
      amount: values.amount,
      categoryId: values.categoryId || null,
      debtId: values.debtId || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your entry details.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        id: initialEntry?.id,
        type: parsed.data.type,
        amount: parsed.data.amount,
        categoryId: parsed.data.type === "debt_payment" ? "cat-debt-payment" : parsed.data.categoryId,
        debtId: parsed.data.type === "debt_payment" ? parsed.data.debtId : null,
        note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
        entryDate: parsed.data.entryDate,
        source: "manual",
        isEstimated: parsed.data.isEstimated,
      });

      if (!initialEntry) {
        setValues((current) => ({
          ...current,
          amount: "",
          note: "",
          isEstimated: false,
        }));
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save entry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="entry-type">Type</Label>
          <Select
            id="entry-type"
            value={values.type}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                type: event.target.value as EntryFormValues["type"],
                categoryId: "",
                debtId: "",
              }))
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="debt_payment">Debt payment</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="entry-amount">Amount</Label>
          <Input
            id="entry-amount"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={values.amount}
            onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="entry-date">Date</Label>
          <Input
            id="entry-date"
            type="date"
            value={values.entryDate}
            onChange={(event) => setValues((current) => ({ ...current, entryDate: event.target.value }))}
          />
        </div>
        {values.type === "debt_payment" ? (
          <div>
            <Label htmlFor="entry-debt">Debt</Label>
            <Select
              id="entry-debt"
              value={values.debtId}
              onChange={(event) => setValues((current) => ({ ...current, debtId: event.target.value }))}
            >
              <option value="">Select debt</option>
              {debts
                .filter((debt) => debt.isActive)
                .map((debt) => (
                  <option key={debt.id} value={debt.id}>
                    {debt.name}
                  </option>
                ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="entry-category">Category</Label>
            <Select
              id="entry-category"
              value={values.categoryId}
              onChange={(event) => setValues((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">Select category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="entry-note">Note</Label>
        <Textarea
          id="entry-note"
          placeholder="Optional note"
          value={values.note}
          onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
        />
      </div>

      <label className="flex items-center gap-3 rounded-[22px] border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
        <input
          checked={values.isEstimated}
          type="checkbox"
          onChange={(event) => setValues((current) => ({ ...current, isEstimated: event.target.checked }))}
        />
        Mark as estimated
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
