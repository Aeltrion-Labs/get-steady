import { useState } from "react";
import type { Debt } from "@get-steady/core";
import type { DebtInput, DebtPaymentInput } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { formatCurrency } from "../../lib/utils";
import { DebtForm } from "../shared/debt-form";
import { PaymentForm } from "../shared/payment-form";

export function DebtsScreen({
  debts,
  defaultDate,
  onSaveDebt,
  onDeleteDebt,
  onRecordPayment,
}: {
  debts: Debt[];
  defaultDate: string;
  onSaveDebt: (input: DebtInput) => Promise<void> | void;
  onDeleteDebt: (debtId: string) => Promise<void> | void;
  onRecordPayment: (input: DebtPaymentInput) => Promise<void> | void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const totalOutstanding = debts.filter((debt) => debt.isActive).reduce((total, debt) => total + debt.balanceCurrent, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border bg-card/90 p-6 shadow-card lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>Debts</Badge>
          <h1 className="mt-3 font-display text-4xl text-foreground">Track balances without pretending complexity helps.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Keep the current balance honest, record payments, and make the outstanding total visible every day.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="border-accent bg-accent/70 text-primary">{formatCurrency(totalOutstanding)} outstanding</Badge>
          <Button onClick={() => setShowCreateForm((current) => !current)}>{showCreateForm ? "Close form" : "Add debt"}</Button>
        </div>
      </div>

      {showCreateForm ? (
        <Card>
          <DebtForm
            onSubmit={async (input) => {
              await onSaveDebt(input);
              setShowCreateForm(false);
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {debts.map((debt) => (
          <Card key={debt.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">{debt.name}</h2>
                  <Badge>{debt.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {debt.lender ?? "No lender added"}
                  {debt.dueDay ? ` • due day ${debt.dueDay}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current balance</p>
                <p className="text-3xl font-semibold text-foreground">{formatCurrency(debt.balanceCurrent)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setPayingDebtId((current) => (current === debt.id ? null : debt.id))}>
                {payingDebtId === debt.id ? "Hide payment form" : "Record payment"}
              </Button>
              <Button variant="secondary" onClick={() => setEditingDebtId((current) => (current === debt.id ? null : debt.id))}>
                {editingDebtId === debt.id ? "Close edit" : "Edit debt"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete ${debt.name}?`)) {
                    void onDeleteDebt(debt.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>

            {payingDebtId === debt.id ? (
              <PaymentForm
                debt={debt}
                initialDate={defaultDate}
                onSubmit={async (input) => {
                  await onRecordPayment(input);
                  setPayingDebtId(null);
                }}
              />
            ) : null}

            {editingDebtId === debt.id ? (
              <DebtForm
                initialDebt={debt}
                onSubmit={async (input) => {
                  await onSaveDebt(input);
                  setEditingDebtId(null);
                }}
                onCancel={() => setEditingDebtId(null)}
              />
            ) : null}
          </Card>
        ))}

        {debts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No debt accounts yet.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
