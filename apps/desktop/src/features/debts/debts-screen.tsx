import { useState } from "react";
import type { Debt } from "@get-steady/core";
import { BadgeDollarSign, Landmark, Plus, ShieldAlert } from "lucide-react";
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
  const activeDebts = debts.filter((debt) => debt.isActive);
  const totalOutstanding = activeDebts.reduce((total, debt) => total + debt.balanceCurrent, 0);
  const totalMinimumPayments = activeDebts.reduce((total, debt) => total + (debt.minimumPayment ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 rounded-[32px] border border-border bg-card/95 p-6 shadow-panel lg:grid-cols-[1.3fr,0.9fr]">
        <div className="space-y-4">
          <Badge>Debts</Badge>
          <h1 className="font-display text-4xl text-foreground">Keep debt visible without overbuilding the process.</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep what you owe current, record payments, and make the total visible enough to stay grounded.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:max-w-[34rem]">
            <div className="rounded-[24px] border border-border/80 bg-muted/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active debts</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{activeDebts.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Keep only the balances that still need attention in the foreground.</p>
            </div>
            <div className="rounded-[24px] border border-border/80 bg-accent/55 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Minimum payments</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(totalMinimumPayments)}</p>
              <p className="mt-1 text-sm text-muted-foreground">A simple floor for what must leave cashflow this cycle.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-[28px] border border-border/80 bg-slate-950 px-5 py-5 text-slate-50 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Badge className="border-white/15 bg-white/10 text-slate-200">Debt picture</Badge>
            <Landmark className="h-5 w-5 text-slate-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Outstanding total</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(totalOutstanding)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              See the full weight clearly, then chip away at it with small, recorded movement.
            </p>
          </div>
          <Button className="w-full bg-white text-slate-950 hover:bg-white/90" onClick={() => setShowCreateForm((current) => !current)}>
            <Plus className="mr-2 h-4 w-4" />
            {showCreateForm ? "Close form" : "Add debt"}
          </Button>
        </div>
      </div>

      {showCreateForm ? (
        <Card className="space-y-4">
          <div>
            <Badge className="border-primary/15 bg-accent/60 text-primary">New debt</Badge>
            <h2 className="mt-3 font-display text-2xl text-foreground">Add debt you want to keep in view.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep the setup compact. You can start with the name and current amount owed, then fill in lender and due details later.
            </p>
          </div>
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
          <Card key={debt.id} className="space-y-5 bg-card/95">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl text-foreground">{debt.name}</h2>
                  <Badge className={debt.isActive ? "border-primary/15 bg-accent/60 text-primary" : ""}>{debt.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {debt.lender ?? "No lender added"}
                  {debt.dueDay ? ` • due day ${debt.dueDay}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current amount owed</p>
                <p className="text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(debt.balanceCurrent)}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-border/70 bg-muted/45 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Minimum payment</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                  {debt.minimumPayment ? formatCurrency(debt.minimumPayment) : "Not set"}
                </p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-muted/45 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Interest rate</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{debt.interestRate ? `${debt.interestRate}%` : "Not set"}</p>
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
              <div className="rounded-[24px] border border-primary/15 bg-accent/35 p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <BadgeDollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Record a payment</h3>
                    <p className="text-sm text-muted-foreground">Capture the payment now so your debt picture stays useful.</p>
                  </div>
                </div>
                <PaymentForm
                  debt={debt}
                  initialDate={defaultDate}
                  onSubmit={async (input) => {
                    await onRecordPayment(input);
                    setPayingDebtId(null);
                  }}
                />
              </div>
            ) : null}

            {editingDebtId === debt.id ? (
              <div className="rounded-[24px] border border-border/80 bg-muted/35 p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Edit debt details</h3>
                  <p className="text-sm text-muted-foreground">Update only what changed. The goal is clarity, not bookkeeping theater.</p>
                </div>
                <DebtForm
                  initialDebt={debt}
                  onSubmit={async (input) => {
                    await onSaveDebt(input);
                    setEditingDebtId(null);
                  }}
                  onCancel={() => setEditingDebtId(null)}
                />
              </div>
            ) : null}
          </Card>
        ))}

        {debts.length === 0 ? (
          <Card className="border-warning/30 bg-warning/5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-warning/15 p-2 text-warning">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-foreground">No debts added yet.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Start with the debts that most affect your monthly breathing room. You can add the rest later.
                </p>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
