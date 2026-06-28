import { describe, it, expect } from "vitest";
import { isCandidateTerminal } from "../lib/mission-progress";

describe("isCandidateTerminal", () => {
  it("returns true when call_status is answered", () => {
    expect(
      isCandidateTerminal({ call_status: "answered", whatsapp_status: "pending" }),
    ).toBe(true);
  });

  it("returns true when whatsapp_status is replied_yes", () => {
    expect(
      isCandidateTerminal({ call_status: "no_answer", whatsapp_status: "replied_yes" }),
    ).toBe(true);
  });

  it("returns true when whatsapp_status is replied_no", () => {
    expect(
      isCandidateTerminal({ call_status: "no_answer", whatsapp_status: "replied_no" }),
    ).toBe(true);
  });

  it("returns true when whatsapp_status is failed", () => {
    expect(
      isCandidateTerminal({ call_status: "no_answer", whatsapp_status: "failed" }),
    ).toBe(true);
  });

  it("returns false when pending on both channels", () => {
    expect(
      isCandidateTerminal({ call_status: "pending", whatsapp_status: "pending" }),
    ).toBe(false);
  });

  it("returns false when call is calling and whatsapp is pending", () => {
    expect(
      isCandidateTerminal({ call_status: "calling", whatsapp_status: "pending" }),
    ).toBe(false);
  });

  it("returns false when whatsapp is sent but not replied", () => {
    expect(
      isCandidateTerminal({ call_status: "no_answer", whatsapp_status: "sent" }),
    ).toBe(false);
  });
});
