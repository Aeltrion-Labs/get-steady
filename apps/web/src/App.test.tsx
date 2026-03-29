import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the primary public-facing promises", () => {
    render(<App />);

    expect(screen.getByText("Get steady with your money.")).toBeTruthy();
    expect(screen.getByText("Your data, your device")).toBeTruthy();
  });
});
