(() => {
  const DOCUMENT_DOMAIN = "edorer-parul-elearning.sgp1.digitaloceanspaces.com";
  const seen = new Set();

  function maybeSend(raw) {
    if (typeof raw !== "string" || !raw) return;
    let url;
    try { url = new URL(raw, location.href); } catch { return; }
    if (url.hostname !== DOCUMENT_DOMAIN || url.protocol !== "https:") return;
    if (!url.pathname.toLowerCase().endsWith(".pdf")) return;
    if (seen.has(url.href)) return;
    seen.add(url.href);
    chrome.runtime.sendMessage({ type: "PDF_EXTRACTOR_DOCUMENT_URL", url: url.href }).catch(() => {});
  }

  function scan() {
    document.querySelectorAll("a[href], iframe[src], embed[src], object[data]").forEach(node => {
      maybeSend(node.href || node.src || node.data || node.getAttribute("href") || node.getAttribute("src") || node.getAttribute("data"));
    });
  }

  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "src", "data"] });
  document.addEventListener("click", () => setTimeout(scan, 0), true);
})();
