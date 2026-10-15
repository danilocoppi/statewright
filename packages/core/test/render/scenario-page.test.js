import { describe, expect, it } from "vitest";
import { toScenarioPage, toSVG } from "../../src/render/index.js";
import { paymentsDoc, readExample } from "../helpers.js";

/** The story a page carries as data, for its script. */
const storyIn = html => JSON.parse(/<script type="application\/json" id="sw-story">(.*?)<\/script>/s.exec(html)[1]);

/** Every scenario's captions left out, so its steps are told by what they did. */
function uncaptioned(doc) {
  for (const scenario of Object.values(doc.annotations.scenarios))
    for (const step of scenario.steps) delete step.caption;
  return doc;
}

describe("a scenario as a page anyone can open (simulator spec §7.2)", () => {
  it("needs nothing else: its style and script are in it, the fonts too when given, and it requests nothing", async () => {
    const doc = paymentsDoc();
    const html = await toScenarioPage(doc, "scn_verificationPausesTheClock", {
      fonts: [{ family: "Inter", weight: "100 900", data: "AAAA" }]
    });
    expect(html.startsWith('<!doctype html>\n<html lang="en">')).toBe(true);
    expect(html).toContain(
      '@font-face { font-family: "Inter"; font-weight: 100 900; font-style: normal; font-display: block; src: url(data:font/woff2;base64,AAAA) format("woff2"); }'
    );
    expect(html).not.toMatch(/<link|<script src|<img|url\(http|(?:src|href)="(?!#)/);
    expect(await toScenarioPage(doc, "scn_verificationPausesTheClock")).not.toContain("@font-face");
  });

  it("draws each level the scenario visits once, as toSVG draws it without its heading and legend", async () => {
    const doc = paymentsDoc();
    const html = await toScenarioPage(doc, "scn_verificationPausesTheClock");
    expect([...html.matchAll(/<figure class="level" data-level="([^"]+)"/g)].map(match => match[1])).toEqual([
      "cnv_lifecycle",
      "cnv_expiryClock",
      "cnv_crossBorderSend"
    ]);
    const clock = await toSVG(doc, "cnv_expiryClock", { header: false, legend: false, idPrefix: "sw-cnv_expiryClock" });
    expect(html).toContain(clock.trim());
    // An edge's label is named by its edge, like its route, so the page can mark both.
    expect(clock).toContain('<path d="');
    expect(clock).toMatch(/data-id="edg_runningPaused"\/>/);
    expect(clock).toContain('<g class="label" data-id="edg_runningPaused">');
  });

  it("tells each step in English: its input, its caption, the answers it was taken with, and the clock", async () => {
    const doc = paymentsDoc();
    const { total, frames } = storyIn(await toScenarioPage(doc, "scn_paysInTime"));
    expect(total).toBe(4);
    expect(frames.map(frame => [frame.number, frame.input, frame.generated])).toEqual([
      ["", "Start", true],
      ["1", "payin.detected", false],
      ["2", "payin.confirmed", false],
      ["3", "leg.completed", false],
      ["4", "payout.completed", false]
    ]);
    expect(frames[0].text).toBe("Starts in clear, running and awaiting_funds.");
    expect(frames[1].text).toBe("The payer's money is seen: the expiry clock stops.");
    expect(frames[4].answers).toEqual(["Which condition holds in paying_out? full amount → completed."]);
    expect(frames[4]).toMatchObject({ clock: "Mon 5 Jan 2026, 09:00", level: "cnv_crossBorderSend" });
    expect(frames[4].trail).toEqual(["Lifecycle engine", "Cross-border send"]);
  });

  it("says what a step without a caption did: where the run went, the timers, and how it ended", async () => {
    const doc = uncaptioned(paymentsDoc());
    const { frames } = storyIn(await toScenarioPage(doc, "scn_verificationPausesTheClock"));
    expect(frames.map(frame => [frame.input, frame.text])).toEqual([
      ["Start", "Starts in clear, running and awaiting_funds."],
      ["verify.started", "running → paused. Client sends verify.started. timer.expiry cancelled."],
      ["2 days later", "awaiting_funds → awaiting_funds. quote_ttl falls due."],
      ["verify.ended", "paused → running. Client sends verify.ended."]
    ]);
    const batch = uncaptioned(JSON.parse(readExample("payout-batch.sttw")));
    const flow = storyIn(await toScenarioPage(batch, "scn_aPayoutIsRefused")).frames;
    expect(flow[0].text).toBe("Waits at the bank confirms. Raises batch.paid.");
    expect(flow[0].answers).toEqual(["Did send a Pix work? It worked.", "Did send a TED work? It failed."]);
    expect(flow[1].text).toBe(
      "the bank confirms → all paid? → some to review. confirmation window cancelled. The run ends in failure."
    );
  });

  it("names where the run is and what each step took by the IDs its figures carry", async () => {
    const doc = paymentsDoc();
    const { frames } = storyIn(await toScenarioPage(doc, "scn_verificationPausesTheClock"));
    expect(frames[1].run).toContainEqual({ ids: ["nod_expiryClock", "nod_paused"], name: "paused" });
    expect(frames[1].fired).toEqual([
      { edge: "edg_runningPaused", from: "nod_running", to: "nod_paused", initial: false }
    ]);
    expect(frames[0].fired.every(item => item.initial)).toBe(true);
  });

  it("says where the story stops when the design no longer takes a step", async () => {
    const doc = paymentsDoc();
    delete doc.annotations.scenarios.scn_paysInTime.steps[2].answers;
    const html = await toScenarioPage(doc, "scn_paysInTime");
    expect(storyIn(html).frames).toHaveLength(3);
    expect(html).toContain(
      '<p class="stopped">The design no longer takes step 3: it now asks “Which condition holds in converting?”, which the recording does not answer.</p>'
    );
  });

  it("tells its stage layout where the story stops, and says it when the story cannot even start", async () => {
    const doc = paymentsDoc();
    delete doc.annotations.scenarios.scn_paysInTime.steps[2].answers;
    const html = await toScenarioPage(doc, "scn_paysInTime");
    expect(storyIn(html).stopped).toBe(
      "The design no longer takes step 3: it now asks “Which condition holds in converting?”, which the recording does not answer."
    );
    expect(html).toContain('<p class="stops" role="status"></p>');

    const batch = JSON.parse(readExample("payout-batch.sttw"));
    delete batch.annotations.scenarios.scn_aPayoutIsRefused.start.answers;
    const unstarted = await toScenarioPage(batch, "scn_aPayoutIsRefused");
    expect(storyIn(unstarted).frames).toEqual([]);
    expect(storyIn(unstarted).stopped).toMatch(/^The design can no longer start this scenario: it now asks “/);
  });

  it("writes names, captions and descriptions as text; a description's Markdown as emphasis and links", async () => {
    const doc = paymentsDoc();
    const scenario = doc.annotations.scenarios.scn_paysInTime;
    scenario.name = "Pays <b>in time</b>";
    scenario.description =
      "Paid **in full**, with `quote_ttl` [explained](https://example.com/q).\n\nA <i>second</i> one.";
    scenario.steps[0].caption = "Seen </script> at once";
    const html = await toScenarioPage(doc, "scn_paysInTime");
    expect(html).toContain('<h1 id="sw-title">Pays &lt;b&gt;in time&lt;/b&gt;</h1>');
    expect(html).toContain(
      '<div class="description"><p>Paid <strong>in full</strong>, with <code>quote_ttl</code> <a href="https://example.com/q">explained</a>.</p><p>A &lt;i&gt;second&lt;/i&gt; one.</p></div>'
    );
    expect(html.match(/<\/script>/g)).toHaveLength(2);
    expect(storyIn(html).frames[1].text).toBe("Seen </script> at once");
  });

  it("is the same page for the same document, and refuses a scenario it does not have", async () => {
    const doc = paymentsDoc();
    expect(await toScenarioPage(doc, "scn_paysInTime")).toBe(await toScenarioPage(paymentsDoc(), "scn_paysInTime"));
    await expect(toScenarioPage(doc, "scn_nope")).rejects.toThrow('No scenario "scn_nope"');
  });
});
