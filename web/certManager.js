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
  } catch (err) {
    console.error(err);
    document.getElementById("certList").innerHTML = `<p style="color:#ef4444">Failed to load certificate data.</p>`;
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
    // split by '|' and trim
    const parts = line.split("|").map(p => p.trim());
    // expected parts: ["", "Company", "Type", "Status", "Valid From", "Valid To", "Download", ""]
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
  // only remove bold markers **, leave links intact
  return s.replace(/\*\*/g, "").trim();
}

function extractUrlFromMd(s) {
  if (!s) return "";
  // match Markdown link (exact URL)
  const m = s.match(/\[.*?\]\((https?:\/\/[^\)]+)\)/);
  if (m && m[1]) return m[1]; // return exact URL from README.md

  // fallback: if plain URL exists, just use it
  const m2 = s.match(/https?:\/\/\S+/);
  if (m2) return m2[0];

  return "";
}

function decodeSafe(u) {
  try {
    return decodeURIComponent(u);
  } catch (e) {
    return u;
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
          <div class="card-meta">${escapeHtml(c.type)}</div>
        </div>
        <div>
          <span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>
        </div>
      </div>

      <div class="card-footer">
        <div class="small">Expires: ${escapeHtml(c.validTo)}</div>
      </div>
    `;

    // open modal with details on click / enter
    card.addEventListener("click", () => openModal(c));
    card.addEventListener("keypress", (e) => { if (e.key === "Enter") openModal(c); });

    container.appendChild(card);
  });
}

function renderUpdates(md) {
  const idx = md.indexOf("# Updates");
  const container = document.getElementById("updatesInner");
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

/* ---------- Modal ---------- */
function openModal(c) {
  const modal = document.getElementById("certModal");
  if (!modal) return;

  document.getElementById("modalName").textContent = c.company;
  document.getElementById("modalMeta").textContent = `${c.type} • Status: ${c.status || (c.status === "" ? "Unknown" : c.status)}`;
  document.getElementById("modalDates").textContent = `Valid: ${c.validFrom} → ${c.validTo}`;

  // Hide/remove the modal-note if present (removes the Disclaimer)
  const noteEl = document.getElementById("modalNote");
  if (noteEl) {
    noteEl.innerHTML = "";
    noteEl.style.display = "none";
  }

  const dl = document.getElementById("modalDownload");
  dl.innerHTML = "";
  if (c.download) {
    // Create a single anchor that shows the (decoded) URL as the button/text.
    const a = document.createElement("a");
    a.href = c.download;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    // Show a decoded URL for readability (falls back to original if decode fails)
    a.textContent = decodeSafe(c.download);
    a.className = "download-link";
    // Make it look/behave like a button if you want CSS for .download-link
    a.setAttribute("role", "button");
    dl.appendChild(a);

    // NOTE: we intentionally do NOT add a small raw URL under the button — per request.
  } else {
    dl.innerHTML = `<div style="color:var(--muted);">No download link found.</div>`;
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
