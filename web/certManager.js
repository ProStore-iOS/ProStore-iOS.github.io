// certManager.js
const README_URL = "https://raw.githubusercontent.com/ProStore-iOS/certificates/refs/heads/main/README.md";

async function init() {
  try {
    const res = await fetch(README_URL);
    if (!res.ok) throw new Error("Failed to fetch README");
    const md = await res.text();

    renderRecommended(md);
    const certs = parseCertTable(md);
    renderCertCards(certs);
    renderUpdates(md);

    setupUpdatesToggle(); // initialise toggle after updates rendered
  } catch (err) {
    console.error(err);
    const certList = document.getElementById("certList");
    if (certList) certList.innerHTML = `<p style="color:#ef4444">Failed to load certificate data.</p>`;
  }
}

/* ---------- Parsing helpers ---------- */

function parseCertTable(md) {
  const lines = md.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith("| company |")) {
      start = i;
      break;
    }
  }
  if (start === -1) return [];

  const rows = [];
  for (let i = start + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    const parts = line.split("|").map(p => p.trim());
    const company = parts[1] || "";
    const type = parts[2] || "";
    const statusRaw = parts[3] || "";
    const validFrom = parts[4] || "";
    const validTo = parts[5] || "";
    const downloadRaw = parts[6] || "";

    const status = stripMd(statusRaw);
    const downloadUrl = extractUrlFromMd(downloadRaw);

    rows.push({
      company: stripMd(company),
      type: stripMd(type),
      status: status,
      validFrom: stripMd(validFrom),
      validTo: stripMd(validTo),
      download: downloadUrl
    });
  }

  return rows;
}

function stripMd(s) {
  if (!s) return "";
  return s.replace(/\*\*/g, "").trim();
}

function extractUrlFromMd(s) {
  if (!s) return "";
  const m = s.match(/\[.*?\]\((https?:\/\/[^\)]+)\)/);
  if (m && m[1]) return m[1];
  const m2 = s.match(/https?:\/\/\S+/);
  if (m2) return m2[0];
  return "";
}

function decodeSafe(u) {
  try {
    // decodeURI to retain characters that decodeURIComponent would throw on
    return decodeURIComponent(u);
  } catch (e) {
    try { return decodeURI(u); } catch (e2) { return u; }
  }
}

/* ---------- Rendering ---------- */

function renderRecommended(md) {
  const lines = md.split("\n");
  let idx = lines.findIndex(l => l.trim().toLowerCase().startsWith("# recommend certificate"));
  let rec = "";
  if (idx !== -1) {
    for (let i = idx + 1; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      rec = ln.replace(/\*\*/g, "").trim();
      rec = rec.replace(/^>\s?/, "").trim();
      break;
    }
  }

  const el = document.getElementById("recommended");
  if (!rec) {
    if (el) el.style.display = "none";
    return;
  }
  if (el) el.innerHTML = `<h3>⭐ Recommended Certificate</h3><p>${escapeHtml(rec)}</p>`;
}

function renderCertCards(certs) {
  const container = document.getElementById("certList");
  if (!container) return;
  container.innerHTML = "";

  if (!certs.length) {
    container.innerHTML = `<p style="color:var(--muted)">No certificates found in the source README.</p>`;
    return;
  }

  certs.forEach((c) => {
    const statusLower = (c.status || "").toLowerCase();
    const isRevoked = statusLower.includes("revok") || statusLower.includes("❌");
    const badgeClass = isRevoked ? "revoked" : "signed";
    const badgeText = isRevoked ? "❌ Revoked" : "✅ Signed";

    const card = document.createElement("div");
    card.className = "cert-card";
    card.setAttribute("role","button");
    card.setAttribute("tabindex","0");
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-title">${escapeHtml(c.company)}</div>
          <div>
          <span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>
        </div>
          <div class="card-meta">${escapeHtml(c.type)}</div>
        </div>
      </div>

      <div class="card-footer">
        <div class="small">Expires: ${escapeHtml(c.validTo)}</div>
      </div>
    `;

    card.addEventListener("click", () => openModal(c));
    card.addEventListener("keypress", (e) => { if (e.key === "Enter") openModal(c); });

    container.appendChild(card);
  });
}

function renderUpdates(md) {
  const idx = md.indexOf("# Updates");
  const container = document.getElementById("updatesInner");
  if (!container) return;
  container.innerHTML = "";

  if (idx === -1) {
    container.innerHTML = `<div class="update-item">No updates section found.</div>`;
    return;
  }

  const after = md.substring(idx + "# Updates".length);
  const lines = after.split("\n");
  const updates = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#")) break;
    if (line === "---") continue;
    line = line.replace(/\*\*/g, "").trim();
    if (line.length > 2) updates.push(line);
  }

  if (!updates.length) {
    container.innerHTML = `<div class="update-item">No updates found.</div>`;
    return;
  }

  container.innerHTML = updates
    .map(u => `<div class="update-item">${escapeHtml(u)}</div>`)
    .join("");
}

/* ---------- Updates toggle (collapsible) ---------- */

function setupUpdatesToggle() {
  const updatesBox = document.getElementById("updates");
  const toggleBtn = document.getElementById("updatesToggle");
  const updatesInner = document.getElementById("updatesInner");
  if (!updatesBox || !toggleBtn || !updatesInner) return;

  const storageKey = "prostore_updates_expanded";
  // stored as "1" = expanded, "0" = collapsed
  const saved = localStorage.getItem(storageKey);
  const initialCollapsed = saved === null ? true : (saved === "1" ? false : true);

  function setCollapsed(collapsed, skipSave = false) {
    if (collapsed) {
      updatesBox.classList.add("collapsed");
      updatesBox.classList.remove("expanded");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.classList.remove("rotated");
      // collapse
      updatesInner.style.maxHeight = "0px";
      updatesInner.style.paddingTop = "0px";
      updatesInner.style.paddingBottom = "0px";
      if (!skipSave) localStorage.setItem(storageKey, "0");
    } else {
      updatesBox.classList.remove("collapsed");
      updatesBox.classList.add("expanded");
      toggleBtn.setAttribute("aria-expanded", "true");
      toggleBtn.classList.add("rotated");
      // expand to exact content height
      const h = updatesInner.scrollHeight;
      updatesInner.style.maxHeight = h + "px";
      // restore padding (CSS fallback values)
      updatesInner.style.paddingTop = "";
      updatesInner.style.paddingBottom = "";
      if (!skipSave) localStorage.setItem(storageKey, "1");
    }
  }

  // init collapsed by default
  setCollapsed(initialCollapsed, true);

  toggleBtn.addEventListener("click", () => {
    const isCollapsed = updatesBox.classList.contains("collapsed");
    setCollapsed(!isCollapsed);
  });

  // keyboard support
  toggleBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleBtn.click();
    }
  });

  // If content changes while expanded, grow/shrink to match
  const mo = new MutationObserver(() => {
    if (!updatesBox.classList.contains("collapsed")) {
      // give the DOM a tick to settle then set exact height
      requestAnimationFrame(() => {
        updatesInner.style.maxHeight = updatesInner.scrollHeight + "px";
      });
    }
  });
  mo.observe(updatesInner, { childList: true, subtree: true, characterData: true });

  // adjust on window resize
  window.addEventListener("resize", () => {
    if (!updatesBox.classList.contains("collapsed")) {
      updatesInner.style.maxHeight = updatesInner.scrollHeight + "px";
    }
  });
}

/* ---------- Modal ---------- */
function openModal(c) {
  const modal = document.getElementById("certModal");
  if (!modal) return;

  // Basic fields
  const nameEl = document.getElementById("modalName");
  const metaEl = document.getElementById("modalMeta");
  const datesEl = document.getElementById("modalDates");
  const dl = document.getElementById("modalDownload");

  if (nameEl) nameEl.textContent = c.company;
  if (metaEl) metaEl.innerHTML = `${c.type} • <b>${c.status || (c.status === "" ? "Unknown" : c.status)}</b>`;
  if (datesEl) datesEl.innerHTML = `<i>Valid from: ${c.validFrom}<br>Expires: ${c.validTo}</i>`;

  if (!dl) {
    console.warn("modalDownload element not found");
  } else {
    dl.innerHTML = "";
    if (c.download) {
      // Anchor (button) — visible text is "Download"
      const a = document.createElement("a");
      a.href = c.download;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Download";
      a.className = "download-link";
      a.setAttribute("role", "button");
      dl.appendChild(a);
    } else {
      dl.innerHTML = `<div style="color:var(--muted);">No download link found.</div>`;
    }
  }

  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

// close modal handlers
document.addEventListener("click", (e) => {
  const modal = document.getElementById("certModal");
  if (!modal) return;
  if (e.target.matches("#modalClose")) closeModal();
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
function closeModal() {
  const modal = document.getElementById("certModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

/* ---------- Utilities ---------- */
function escapeHtml(s){
  if (!s) return "";
  return s.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}

/* Start */
init();
