import { afterEach, expect, it, vi } from "vitest";
import { observeMicroDC } from "./microdcVision";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const image = "data:image/jpeg;base64,YQ==";
it("rejects remote image URLs before a request", async () => {
  await expect(observeMicroDC("http://localhost/private")).rejects.toThrow("Provide a JPEG");
});
it("requires a backend key", async () => {
  vi.stubEnv("MICRODC_API_KEY", "");
  await expect(observeMicroDC(image)).rejects.toThrow("not configured");
});
it("sends the selected model and never classifies impairment", async () => {
  vi.stubEnv("MICRODC_API_KEY", "test-only");
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ eyesClosed: true, lookingAway: true, faceVisible: true }) } }] }) });
  vi.stubGlobal("fetch", fetchMock);
  const result = await observeMicroDC(image);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("qwen2.5vl:7b");
  expect(result.isDrunk || result.isSleepy || result.isDistracted).toBe(false);
  expect(result.confidence).toBe(0);
  expect(result.observationOnly).toBe(true);
  expect(result.eyesClosed).toBe(true);
  expect(result.indicators).toContain("Eyes appear closed in this frame");
});
it("does not treat malformed output as a successful observation", async () => {
  vi.stubEnv("MICRODC_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) }));
  await expect(observeMicroDC(image)).rejects.toThrow("incomplete");
});
it("parses JSON wrapped in extra text or markdown", async () => {
  vi.stubEnv("MICRODC_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: 'Here is the result:\n```json\n{"eyesClosed": false, "lookingAway": false, "faceVisible": true}\n```',
        },
      }],
    }),
  }));
  const result = await observeMicroDC(image);
  expect(result.faceVisible).toBe(true);
  expect(result.eyesClosed).toBe(false);
  expect(result.indicators).toContain("Eyes appear open in this frame");
});
it("accepts string booleans from the model", async () => {
  vi.stubEnv("MICRODC_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: [{ type: "text", text: '{"eyesClosed":"true","lookingAway":"false","faceVisible":"true"}' }],
        },
      }],
    }),
  }));
  const result = await observeMicroDC(image);
  expect(result.eyesClosed).toBe(true);
  expect(result.lookingAway).toBe(false);
});
