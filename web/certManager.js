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

  // skip header + separator
  const rows = [];
  for (let i = start + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    // split by '|' and remove first/last empty segments
    const parts = line.split("|").map(p => p.trim());
    // parts usually: ["", "Company", "Type", ... , ""]
    // discard any leading/trailing empty strings
    if (parts.length < 6) continue;
    // filter out possible empty at start
    const cols = parts.filter((c, idx) => c !== "" || (c === "" && idx > 0 && idx < parts.length - 1));
    // safer: take last 6 non-empty-ish entries from the line
    // but easier: take indices 1..6 in normal layout
    const company = parts[1] || "";
    const type = parts[2] || "";
    const statusRaw = parts[3] || "";
    const validFrom = parts[4] || "";
    const validTo = parts[5] || "";
    const downloadRaw = parts[6] || "";

    const status = statusRaw.replace(/\*\*/g, "").trim();
    const downloadUrlMatch = downloadRaw.match(/\((https?:\/\/[^\)]+)\)/);
    const downloadUrl = downloadUrlMatch ? decodeURIComponent(downloadUrlMatch[1]) : (downloadRaw.match(/https?:\/\//) ? downloadRaw : "");

    rows.push({
      company: company,
      type: stripMd(type),
      status: stripMd(status),
      validFrom: stripMd(validFrom),
      validTo: stripMd(validTo),
      download: downloadUrl
    });
  }

  return rows;
}

function stripMd(s) {
  return s.replace(/\*\*/g, "").replace(/\[|\]/g, "").trim();
}

/* ---------- Rendering ---------- */

function renderRecommended(md) {
  const m = md.match(/# Recommend Certificate\s+([\s\S]*?)\n\n/);
  let rec = "";
  if (m) rec = m[1].trim();
  else {
    // fallback: look for header then bold on next line
    const m2 = md.match(/# Recommend Certificate\s*\n\*\*(.+?)\*\*/s);
    if (m2) rec = m2[1].trim();
  }

  const el = document.getElementById("recommended");
  if (!rec) {
    el.style.display = "none";
    return;
  }
  el.innerHTML = `<h3>⭐ Recommended Certificate</h3><p>${escapeHtml(rec)}</p>`;
}

function renderCertCards(certs) {
  const container = document.getElementById("certList");
  container.innerHTML = "";

  if (!certs.length) {
    container.innerHTML = `<p style="color:var(--muted)">No certificates found in the source README.</p>`;
    return;
  }

  certs.forEach((c, idx) => {
    const statusLower = c.status.toLowerCase();
    const isRevoked = statusLower.includes("revok") || statusLower.includes("❌");
    const badgeClass = isRevoked ? "revoked" : "valid";
    const badgeText = c.status || (isRevoked ? "Revoked" : "Unknown");

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
        <div class="small">From: ${escapeHtml(c.validFrom)}</div>
        <div class="small">To: ${escapeHtml(c.validTo)}</div>
      </div>
    `;

    // click handler opens modal with details
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

  // capture content after "# Updates" until next heading that starts with '# ' or EOF
  const after = md.substring(idx + "# Updates".length);
  const lines = after.split("\n");
  const updates = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#")) break;
    // lines that start with ** are update entries in this README
    if (line.startsWith("**") && line.endsWith("**")) {
      updates.push(line.replace(/\*\*/g, ""));
    } else if (line.startsWith("**")) {
      updates.push(line.replace(/\*\*/g, ""));
    } else {
      // sometimes they aren't bold — include them too
      updates.push(line);
    }
  }

  if (!updates.length) {
    container.innerHTML = `<div class="update-item">No updates found.</div>`;
    return;
  }

  container.innerHTML = updates.map(u => `<div class="update-item">${escapeHtml(u)}</div>`).join("");
}

/* ---------- Modal ---------- */
function openModal(c) {
  const modal = document.getElementById("certModal");
  document.getElementById("modalName").textContent = c.company;
  document.getElementById("modalMeta").textContent = `${c.type} • Status: ${c.status}`;
  document.getElementById("modalDates").textContent = `Valid: ${c.validFrom} → ${c.validTo}`;

  const dl = document.getElementById("modalDownload");
  if (c.download) {
    const a = document.createElement("a");
    a.href = c.download;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Download";
    dl.innerHTML = "";
    dl.appendChild(a);
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
