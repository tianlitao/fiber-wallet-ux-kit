import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("@/app/layoutProvider", () => ({
  LayoutProvider: ({ children }: { children: React.ReactNode }) => children,
}));
