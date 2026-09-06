/**
 * CDP paint verification — traces ONLY during the transform probe,
 * after the page has settled.
 */
import { createRequire } from "module";
import { existsSync } from "fs";

const require = createRequire(import.meta.url);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const puppeteer = require("puppeteer-core");
  const executablePath = findChrome();
  if (!executablePath) {
    console.error("Chrome not found");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto("http://localhost:3000/paint-check", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForSelector("[data-paint-root]", { timeout: 60000 });
  await page.waitForSelector(".piece", { timeout: 60000 });
  // Settle after hydration
  await new Promise((r) => setTimeout(r, 2000));

  const client = await page.createCDPSession();

  // Baseline: no animation
  await page.evaluate(() => {
    document.querySelector(".paint-check-board")?.classList.remove("paint-check-board");
  });
  await new Promise((r) => setTimeout(r, 300));

  const collect = async (label, prepare) => {
    await prepare();
    const events = [];
    const onData = (ev) => {
      for (const v of ev.value) events.push(v);
    };
    client.on("Tracing.dataCollected", onData);

    await client.send("Tracing.start", {
      categories: [
        "devtools.timeline",
        "disabled-by-default-devtools.timeline",
        "blink",
        "cc",
      ].join(","),
      options: "record-as-much-as-possible",
    });

    await new Promise((r) => setTimeout(r, 2000));

    await new Promise((resolve) => {
      client.once("Tracing.tracingComplete", resolve);
      client.send("Tracing.end");
    });
    client.off("Tracing.dataCollected", onData);

    const names = events.map((e) => e.name).filter(Boolean);
    const count = (n) => names.filter((x) => x === n).length;
    const paint = count("Paint") + count("PaintImage");
    const layout = count("Layout") + count("UpdateLayoutTree");
    const composite =
      count("CompositeLayers") +
      count("UpdateLayerTree") +
      names.filter((n) => /Composite|LayerTree/.test(n)).length;

    console.log(`\n[${label}] ~2s window`);
    console.log(`  Paint:     ${paint}`);
    console.log(`  Layout:    ${layout}`);
    console.log(`  Composite: ${composite}`);
    return { paint, layout, composite };
  };

  const idle = await collect("idle (no probe)", async () => {
    await page.evaluate(() => {
      document.querySelector("[data-paint-root]")?.classList.remove("paint-check-board");
    });
  });

  const moving = await collect("probe translating", async () => {
    await page.evaluate(() => {
      document.querySelector("[data-paint-root]")?.classList.add("paint-check-board");
    });
    await new Promise((r) => setTimeout(r, 100));
  });

  await browser.close();

  const paintDelta = moving.paint - idle.paint;
  const layoutDelta = moving.layout - idle.layout;

  console.log("\n--- Deltas (moving − idle) ---");
  console.log(`  Δ Paint:  ${paintDelta}`);
  console.log(`  Δ Layout: ${layoutDelta}`);

  // Continuous transform should not add meaningful layout.
  // A few paints can occur when the layer is first promoted.
  if (layoutDelta > 5) {
    console.error("\nFAIL: layout increased during transform probe.");
    process.exit(1);
  }
  if (paintDelta > 25) {
    console.error("\nFAIL: paint spiked during transform probe.");
    process.exit(1);
  }

  console.log("\nPASS: probe motion did not thrash paint/layout vs idle.");
  console.log("Also confirm visually: /paint-check → Rendering → Paint flashing.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
