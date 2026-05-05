// edge-functions/trackers.js

const SOURCES = [
  "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt",
  "https://raw.githubusercontent.com/DeSireFire/animeTrackerList/master/AT_best.txt",
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "EdgeOne-Tracker-Aggregator",
      "Accept": "text/plain,*/*",
    },
  });

  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }

  return res.text();
}

function parseTrackers(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => /^(udp|http|https|ws|wss):\/\//i.test(line));
}

export async function onRequestGet() {
  const results = await Promise.allSettled(SOURCES.map(fetchText));

  const trackers = new Set();
  const failed = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (result.status === "fulfilled") {
      for (const tracker of parseTrackers(result.value)) {
        trackers.add(tracker);
      }
    } else {
      failed.push(result.reason?.message || SOURCES[i]);
    }
  }

  if (trackers.size === 0) {
    return new Response(
      `No trackers fetched.\n\nFailures:\n${failed.join("\n")}\n`,
      {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // 空行分隔
  const body = Array.from(trackers).join("\n\n") + "\n";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Tracker-Count": String(trackers.size),
      "X-Source-Count": String(SOURCES.length),
      "X-Source-Failures": String(failed.length),
    },
  });
}

// 非 GET 也给个明确提示
export function onRequest() {
  return new Response("Method Not Allowed\n", {
    status: 405,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Allow": "GET",
    },
  });
}
