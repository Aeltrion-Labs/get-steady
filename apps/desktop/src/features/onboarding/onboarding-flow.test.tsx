import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingFlow } from "./onboarding-flow";

describe("OnboardingFlow", () => {
  it("guides the first-run habit setup and allows skipping", async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();

    render(
      <OnboardingFlow
        categories={[
          { id: "cat-income", name: "Income", type: "income" },
          { id: "cat-groceries", name: "Groceries", type: "expense" },
        ]}
        onComplete={onComplete}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByText("Own your money habit")).toBeInTheDocument();
    expect(screen.getByText("Skip for now")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Start setup"));
    fireEvent.change(screen.getByLabelText("Preferred daily check-in time"), { target: { value: "19:00" } });
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByLabelText("Groceries"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Finish setup"));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyCheckInTime: "19:00",
        remindersEnabled: true,
        selectedCategoryIds: ["cat-groceries"],
      }),
    );
  });
});
