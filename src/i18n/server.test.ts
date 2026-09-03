import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { getServerLocale } from "./server";

describe("getServerLocale", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
  });

  it("defaults new users to English", async () => {
    cookiesMock.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) });

    await expect(getServerLocale()).resolves.toBe("en");
  });

  it("keeps a stored locale preference", async () => {
    cookiesMock.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "de" }) });

    await expect(getServerLocale()).resolves.toBe("de");
  });
});
