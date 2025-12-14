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
    // guard: ensure at least 7 meaningful columns
    const meaningful = parts.filter((p, idx) => p !== "" || (idx > 0 && idx < parts.length - 1));
    // We'll read by indexes, but check boundary
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
  return s.replace(/\*\*/g, "").replace(/\[|\]/g, "").trim();
}

function extractUrlFromMd(s) {
  if (!s) return "";
  // match (https://...)
  const m = s.match(/\((https?:\/\/[^\)]+)\)/);
  if (m && m[1]) return decodeSafe(m[1]);
  // sometimes the link isn't wrapped in parentheses, try to find plain url
  const m2 = s.match(/https?:\/\/\S+/);
  if (m2) return decodeSafe(m2[0]);
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
  // find the Recommend Certificate section
  // README uses:
  // # Recommend Certificate 
  // **China Telecommunications Corporation V2 - ❌ Revoked**
  //
  // We'll capture the next non-empty line and strip stars.
  const lines = md.split("\n");
  let idx = lines.findIndex(l => l.trim().toLowerCase().startsWith("# recommend certificate"));
  let rec = "";
  if (idx !== -1) {
    // find first non-empty line after the header
    for (let i = idx + 1; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      // strip ** and md markup
      rec = ln.replace(/\*\*/g, "").trim();
      // remove surrounding markdown quote markers or other noise
      rec = rec.replace(/^>\s?/, "").trim();
      break;
    }
  }

  const el = document.getElementById("recommended");
  if (!rec) {
    el.style.display = "none";
    return;
  }
  // show plain text (no bold)
  el.innerHTML = `<h3>⭐ Recommended Certificate</h3><p>${escapeHtml(rec)}</p>`;
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

    // 🚫 ignore markdown dividers like ---
    if (line === "---") continue;

    // strip bold markers
    line = line.replace(/\*\*/g, "").trim();

    // only keep real update lines
    if (line.length > 2) {
      updates.push(line);
    }
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
  document.getElementById("modalName").textContent = c.company;
  document.getElementById("modalMeta").textContent = `${c.type} • Status: ${c.status || (c.status === "" ? "Unknown" : c.status)}`;
  document.getElementById("modalDates").textContent = `Valid: ${c.validFrom} → ${c.validTo}`;

  const dl = document.getElementById("modalDownload");
  dl.innerHTML = "";
  if (c.download) {
    const a = document.createElement("a");
    a.href = c.download;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Download";
    dl.appendChild(a);

    // also show raw url (small)
    const small = document.createElement("div");
    small.style.marginTop = "8px";
    small.style.fontSize = "12px";
    small.style.color = "var(--muted)";
    small.textContent = c.download;
    dl.appendChild(small);
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
