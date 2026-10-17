const APP_DOMAIN = "elearning.paruluniversity.ac.in";
const DOCUMENT_DOMAIN = "edorer-parul-elearning.sgp1.digitaloceanspaces.com";
const PDF_FILTER = `https://${DOCUMENT_DOMAIN}/*`;

function header(headers, name) {
  const item = (headers || []).find(h => h.name && h.name.toLowerCase() === name.toLowerCase());
  return item ? String(item.value || "") : "";
}
function isPdfHost(raw) {
  try { const u = new URL(raw); return u.protocol === "https:" && u.hostname === DOCUMENT_DOMAIN; }
  catch { return false; }
}
async function diagnostic(message) {
  await chrome.storage.local.set({ diagnostic: { message, time: Date.now() } });
}
async function capture(details, headers = []) {
  if (!isPdfHost(details.url)) return;
  const u = new URL(details.url);
  const ct = header(headers, "content-type").toLowerCase();
  const pdfByUrl = u.pathname.toLowerCase().endsWith(".pdf");
  const pdfByType = ct.includes("application/pdf");
  if (!pdfByUrl && !pdfByType) {
    await diagnostic(`Request seen on PDF host, but not identified as PDF (${ct || "content type unavailable"}).`);
    return;
  }
  const rawName = decodeURIComponent(u.pathname.split("/").pop() || "document.pdf");
  const filename = rawName.toLowerCase().endsWith(".pdf") ? rawName : `${rawName}.pdf`;
  const size = Number(header(headers, "content-length")) || 0;
  const item = { url: details.url, filename, size, detectedAt: Date.now() };
  try {
    const { pdfs = [] } = await chrome.storage.local.get({ pdfs: [] });
    const idx = pdfs.findIndex(x => x.url === item.url);
    if (idx >= 0) pdfs[idx] = { ...pdfs[idx], ...item };
    else pdfs.unshift(item);
    await chrome.storage.local.set({ pdfs: pdfs.slice(0, 100) });
    await chrome.action.setBadgeText({ text: String(Math.min(pdfs.length, 99)) });
    await chrome.action.setBadgeBackgroundColor({ color: "#6d5dfc" });
    await diagnostic(`Detected PDF: ${filename}`);
  } catch (e) {
    await diagnostic(`Could not save detected PDF: ${String(e)}`);
  }
}

// Observe PDF-host responses. Both events are used to accommodate different
// request lifecycles; duplicate URLs are de-duplicated in storage.
chrome.webRequest.onHeadersReceived.addListener(
  d => { capture(d, d.responseHeaders || []); },
  { urls: [PDF_FILTER] },
  ["responseHeaders"]
);
chrome.webRequest.onCompleted.addListener(
  d => { capture(d, d.responseHeaders || []); },
  { urls: [PDF_FILTER] },
  ["responseHeaders"]
);

// The content script on the app host sends URLs that the viewer exposes.
// This supplements webRequest for links/embedded PDF viewers.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.url) {
    try {
      if (new URL(sender.url).hostname !== APP_DOMAIN) return;
    } catch { return; }
  }
  if (message?.type === "PDF_EXTRACTOR_DOCUMENT_URL" && typeof message.url === "string" && isPdfHost(message.url)) {
    capture({ url: message.url, statusCode: 200 }, []);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  diagnostic("Ready. Open a PDF through elearning.paruluniversity.ac.in, then reopen this popup.");
});
