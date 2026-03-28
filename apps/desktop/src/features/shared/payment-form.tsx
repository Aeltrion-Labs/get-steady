import { useState } from "react";
import { z } from "zod";
import type { Debt } from "@get-steady/core";
import type { DebtPaymentInput } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than zero."),
  entryDate: z.string().min(1, "Date is required."),
  note: z.string().optional(),
});

export function PaymentForm({
  debt,
  initialDate,
  onSubmit,
}: {
  debt: Debt;
  initialDate: string;
  onSubmit: (input: DebtPaymentInput) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(initialDate);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = paymentSchema.safeParse({ amount, entryDate, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the payment details.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        debtId: debt.id,
        amount: parsed.data.amount,
        entryDate: parsed.data.entryDate,
        note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
      });
      setAmount("");
      setNote("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`payment-amount-${debt.id}`}>Payment amount</Label>
          <Input
            id={`payment-amount-${debt.id}`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`payment-date-${debt.id}`}>Payment date</Label>
          <Input
            id={`payment-date-${debt.id}`}
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`payment-note-${debt.id}`}>Note</Label>
        <Textarea id={`payment-note-${debt.id}`} value={note} onChange={(event) => setNote(event.target.value)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Recording..." : `Record payment for ${debt.name}`}
      </Button>
    </form>
  );
}
