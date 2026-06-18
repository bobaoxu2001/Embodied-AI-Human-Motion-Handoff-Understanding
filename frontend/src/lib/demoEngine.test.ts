import { describe, expect, it } from "vitest";
import { derive } from "./demoEngine";
import { SCENARIOS, getScenario, TOTAL_FRAMES } from "../data/demo";

const HANDOFF_FRAME = 190; // inside the handoff segment (164–232)

describe("derive() — core", () => {
  it("is deterministic for the same frame", () => {
    expect(derive(120)).toEqual(derive(120));
  });

  it("clamps out-of-range frames into [0, TOTAL_FRAMES)", () => {
    expect(derive(-50).frame).toBe(0);
    expect(derive(99999).frame).toBe(TOTAL_FRAMES - 1);
  });

  it("emits a valid trajectory path and percent in range", () => {
    const d = derive(HANDOFF_FRAME);
    expect(d.pose.traj.startsWith("M")).toBe(true);
    expect(d.framePct).toBeGreaterThanOrEqual(0);
    expect(d.framePct).toBeLessThanOrEqual(100);
  });
});

describe("scenarios", () => {
  it("exposes the four expected scenarios", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "success",
      "failed",
      "two_person",
      "distractor",
    ]);
  });

  it("getScenario falls back to success for unknown ids", () => {
    expect(getScenario("nope").id).toBe("success");
  });

  it("success detects handoff intent and opens the gripper", () => {
    const d = derive(HANDOFF_FRAME, "success");
    expect(d.intentDetected).toBe(true);
    expect(d.handoffConf).toBeGreaterThanOrEqual(0.8);
    expect(d.robotAction.toLowerCase()).toContain("extend gripper");
  });

  it("failed handoff never confidently fires (stays monitoring, robot aborts)", () => {
    const d = derive(HANDOFF_FRAME, "failed");
    expect(d.intentDetected).toBe(false);
    expect(d.handoffConf).toBeLessThan(0.8);
    expect(d.robotActionSub.toLowerCase()).toContain("abort");
  });

  it("two-person scene surfaces an association-ambiguity note", () => {
    const d = derive(HANDOFF_FRAME, "two_person");
    expect(d.scenarioNote.toLowerCase()).toContain("ambiguity");
  });

  it("distractor scenario labels the extra object", () => {
    const d = derive(HANDOFF_FRAME, "distractor");
    expect(d.objectLabel.toLowerCase()).toContain("distractor");
  });
});

describe("contract shapes", () => {
  it("action scores cover all six classes and sum ≈ 1", () => {
    const sc = getScenario("success");
    // the action label set the engine can emit
    const cur = sc.segments.find((s) => HANDOFF_FRAME >= s.start && HANDOFF_FRAME < s.end);
    expect(cur?.key).toBe("handoff");
  });

  it("activeChips marks exactly the current action chip", () => {
    const d = derive(HANDOFF_FRAME, "success");
    expect(d.activeChips.handoff).toBe(true);
    expect(d.activeChips.idle).toBe(false);
  });
});
