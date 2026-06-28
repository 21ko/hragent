import { describe, it, expect } from "vitest";
import { TOOLS, openaiTools, mcpTools, manifest } from "../lib/manifest";

describe("TOOLS", () => {
  it("has 3 tool definitions", () => {
    expect(TOOLS).toHaveLength(3);
  });

  it("includes create_staffing_mission", () => {
    const tool = TOOLS.find((t) => t.name === "create_staffing_mission");
    expect(tool).toBeDefined();
    expect(tool!.http.method).toBe("POST");
    expect(tool!.http.path).toContain("/api/v1/missions");
  });

  it("includes get_mission", () => {
    const tool = TOOLS.find((t) => t.name === "get_mission");
    expect(tool).toBeDefined();
    expect(tool!.http.method).toBe("GET");
  });

  it("includes list_candidates", () => {
    const tool = TOOLS.find((t) => t.name === "list_candidates");
    expect(tool).toBeDefined();
    expect(tool!.http.method).toBe("GET");
  });
});

describe("openaiTools", () => {
  it("returns tools in OpenAI function-calling format", () => {
    const tools = openaiTools();
    expect(tools).toHaveLength(3);
    tools.forEach((t) => {
      expect(t.type).toBe("function");
      expect(t.function.name).toBeTruthy();
      expect(t.function.parameters).toBeDefined();
    });
  });
});

describe("mcpTools", () => {
  it("returns tools in MCP format with inputSchema", () => {
    const tools = mcpTools();
    expect(tools).toHaveLength(3);
    tools.forEach((t) => {
      expect(t.name).toBeTruthy();
      expect(t.inputSchema).toBeDefined();
    });
  });
});

describe("manifest", () => {
  it("returns a manifest object with correct structure", () => {
    const m = manifest("https://example.com");
    expect(m.name).toBe("staffly");
    expect(m.base_url).toBe("https://example.com");
    expect(m.endpoints).toHaveLength(3);
    expect(m.openai_tools).toHaveLength(3);
    expect(m.mcp_tools).toHaveLength(3);
    expect(m.auth.type).toBe("bearer");
  });
});
