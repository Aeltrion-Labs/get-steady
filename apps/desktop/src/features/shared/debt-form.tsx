import { useState } from "react";
import { z } from "zod";
import type { Debt } from "@get-steady/core";
import type { DebtInput } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const debtSchema = z.object({
  name: z.string().min(1, "Name is required."),
  lender: z.string().optional(),
  balanceCurrent: z.coerce.number().nonnegative("Balance cannot be negative."),
  interestRate: z.union([z.literal(""), z.coerce.number().nonnegative()]),
  minimumPayment: z.union([z.literal(""), z.coerce.number().nonnegative()]),
  dueDay: z.union([z.literal(""), z.coerce.number().int().min(1).max(31)]),
  isActive: z.boolean(),
});

export function DebtForm({
  initialDebt,
  onSubmit,
  onCancel,
}: {
  initialDebt?: Debt;
  onSubmit: (input: DebtInput) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState({
    name: initialDebt?.name ?? "",
    lender: initialDebt?.lender ?? "",
    balanceCurrent: initialDebt ? String(initialDebt.balanceCurrent) : "",
    interestRate: initialDebt?.interestRate ? String(initialDebt.interestRate) : "",
    minimumPayment: initialDebt?.minimumPayment ? String(initialDebt.minimumPayment) : "",
    dueDay: initialDebt?.dueDay ? String(initialDebt.dueDay) : "",
    isActive: initialDebt?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = debtSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the debt details.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        id: initialDebt?.id,
        name: parsed.data.name.trim(),
        lender: parsed.data.lender?.trim() ? parsed.data.lender.trim() : null,
        balanceCurrent: parsed.data.balanceCurrent,
        interestRate: parsed.data.interestRate === "" ? null : parsed.data.interestRate,
        minimumPayment: parsed.data.minimumPayment === "" ? null : parsed.data.minimumPayment,
        dueDay: parsed.data.dueDay === "" ? null : parsed.data.dueDay,
        isActive: parsed.data.isActive,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save debt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="debt-name">Name</Label>
          <Input id="debt-name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div>
          <Label htmlFor="debt-lender">Lender</Label>
          <Input
            id="debt-lender"
            value={values.lender}
            onChange={(event) => setValues((current) => ({ ...current, lender: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="debt-balance">Current balance</Label>
          <Input
            id="debt-balance"
            inputMode="decimal"
            value={values.balanceCurrent}
            onChange={(event) => setValues((current) => ({ ...current, balanceCurrent: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="debt-interest">Interest rate</Label>
          <Input
            id="debt-interest"
            inputMode="decimal"
            value={values.interestRate}
            onChange={(event) => setValues((current) => ({ ...current, interestRate: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="debt-minimum">Minimum payment</Label>
          <Input
            id="debt-minimum"
            inputMode="decimal"
            value={values.minimumPayment}
            onChange={(event) => setValues((current) => ({ ...current, minimumPayment: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="debt-due-day">Due day</Label>
          <Input
            id="debt-due-day"
            inputMode="numeric"
            value={values.dueDay}
            onChange={(event) => setValues((current) => ({ ...current, dueDay: event.target.value }))}
          />
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm text-muted-foreground">
          <input
            checked={values.isActive}
            type="checkbox"
            onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active debt
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : initialDebt ? "Update debt" : "Create debt"}
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
