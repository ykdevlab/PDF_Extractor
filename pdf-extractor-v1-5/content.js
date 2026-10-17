(() => {
  'use strict';
  const DOCUMENT_DOMAIN = 'edorer-parul-elearning.sgp1.digitaloceanspaces.com';
  const MARK = 'data-pdf-extractor-actions';
  const attached = new WeakSet();
  const directUrls = new Map();
  let scanQueued = false;

  function validPdf(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    try {
      const u = new URL(raw, location.href);
      if (u.protocol !== 'https:' || u.hostname !== DOCUMENT_DOMAIN) return null;
      if (!u.pathname.toLowerCase().endsWith('.pdf')) return null;
      return u.href;
    } catch { return null; }
  }

  function sendUrl(raw) {
    const url = validPdf(raw);
    if (!url || directUrls.has(url)) return url;
    directUrls.set(url, Date.now());
    try { chrome.runtime.sendMessage({ type: 'PDF_EXTRACTOR_DOCUMENT_URL', url }).catch(() => {}); } catch {}
    return url;
  }

  function findCard(node) {
    let el = node instanceof Element ? node : node?.parentElement;
    for (let i = 0; el && i < 8; i++, el = el.parentElement) {
      const text = (el.innerText || '').trim();
      if (text.length > 4 && text.length < 1200 && (/\.pdf\b/i.test(text) || /assignment|lecture|notes|material|pdf/i.test(text)) && (el.querySelector('a,button,[role="button"]'))) {
        const r = el.getBoundingClientRect();
        if (r.width > 250 && r.height > 35) return el;
      }
    }
    return node.parentElement || node;
  }

  function makeButton(label, kind, url) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    a.setAttribute('aria-label', label);
    a.title = label;
    a.style.cssText = [
      'display:inline-flex','align-items:center','justify-content:center','gap:6px',
      'min-height:34px','padding:0 13px','border-radius:10px','font:600 13px/1.2 inherit',
      'font-family:inherit','text-decoration:none','white-space:nowrap','cursor:pointer',
      'box-sizing:border-box','transition:background .15s,border-color .15s,transform .15s',
      kind === 'open'
        ? 'background:#625cf6;color:#fff;border:1px solid #625cf6;box-shadow:0 1px 2px rgba(30,41,59,.12)'
        : 'background:#fff;color:#5149dc;border:1px solid #dcdafe'
    ].join(';');
    a.addEventListener('mouseenter', () => { a.style.filter = 'brightness(.97)'; });
    a.addEventListener('mouseleave', () => { a.style.filter = ''; });
    if (kind === 'download') {
      a.removeAttribute('target');
      a.download = '';
    }
    return a;
  }

  function addActions(card, rawUrl) {
    const url = validPdf(rawUrl);
    if (!url || !card || card.querySelector(`[${MARK}]`)) return;
    const originalOpen = [...card.querySelectorAll('a,button,[role="button"]')].find(el => /^(open|view|download)(\s|$)/i.test((el.innerText || el.getAttribute('aria-label') || '').trim()));
    const wrap = document.createElement('span');
    wrap.setAttribute(MARK, 'true');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:8px;vertical-align:middle;';
    wrap.append(makeButton('Open PDF', 'open', url), makeButton('Download', 'download', url));
    if (originalOpen?.parentElement) {
      originalOpen.insertAdjacentElement('afterend', wrap);
    } else {
      const target = card.querySelector('[class*="action"], [class*="button"], [class*="right"]') || card;
      target.appendChild(wrap);
    }
  }

  function scanDom() {
    scanQueued = false;
    document.querySelectorAll('a[href], iframe[src], embed[src], object[data]').forEach(node => {
      const raw = node.href || node.src || node.data || node.getAttribute('href') || node.getAttribute('src') || node.getAttribute('data');
      const url = sendUrl(raw);
      if (url && node.tagName === 'A') addActions(findCard(node), url);
    });
  }
  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(scanDom);
  }

  // Some course pages reveal the actual file only after the original Open button
  // is used. Associate the newly captured PDF with that clicked assignment card.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('a,button,[role="button"]') : null;
    if (!target || !/^(open|view)(\s|$)/i.test((target.innerText || target.getAttribute('aria-label') || '').trim())) return;
    const card = findCard(target);
    const clickAt = Date.now();
    try {
      chrome.storage.local.get({ pdfs: [] }).then(() => {
        const started = Date.now();
        const poll = () => {
          chrome.storage.local.get({ pdfs: [] }).then(({ pdfs }) => {
            const candidates = (pdfs || []).filter(p => validPdf(p.url) && (p.detectedAt || 0) >= clickAt - 1500).sort((a, b) => (b.detectedAt || 0) - (a.detectedAt || 0));
            if (candidates.length) addActions(card, candidates[0].url);
            else if (Date.now() - started < 12000) setTimeout(poll, 450);
          }).catch(() => {});
        };
        setTimeout(poll, 450);
      }).catch(() => {});
    } catch {}
  }, true);

  if (document.documentElement) {
    scheduleScan();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'src', 'data'] });
  } else {
    document.addEventListener('DOMContentLoaded', scheduleScan, { once: true });
  }
})();
