import { describe, it, expect } from "vitest";
import { normalizePhone } from "../lib/db";

describe("normalizePhone", () => {
  it("strips 'whatsapp:' prefix", () => {
    expect(normalizePhone("whatsapp:+33612345678")).toBe("+33612345678");
  });

  it("strips 'WhatsApp:' prefix (case-insensitive)", () => {
    expect(normalizePhone("WhatsApp:+33612345678")).toBe("+33612345678");
  });

  it("strips spaces", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("strips dashes", () => {
    expect(normalizePhone("+33-6-12-34-56-78")).toBe("+33612345678");
  });

  it("strips dots", () => {
    expect(normalizePhone("+33.6.12.34.56.78")).toBe("+33612345678");
  });

  it("strips parentheses", () => {
    expect(normalizePhone("+33(0)612345678")).toBe("+330612345678");
  });

  it("keeps + and digits only", () => {
    expect(normalizePhone("+33 6.12.34.56.78")).toBe("+33612345678");
  });

  it("handles clean numbers unchanged", () => {
    expect(normalizePhone("+33612345678")).toBe("+33612345678");
  });

  it("handles empty string", () => {
    expect(normalizePhone("")).toBe("");
  });

  it("handles whatsapp prefix with spaces", () => {
    expect(normalizePhone("whatsapp:+33 612 345 678")).toBe("+33612345678");
  });
});
