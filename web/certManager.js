const README_URL =
  "https://raw.githubusercontent.com/ProStore-iOS/certificates/refs/heads/main/README.md";

fetch(README_URL)
  .then(res => res.text())
  .then(md => {
    renderRecommended(md);
    renderTable(md);
    renderUpdates(md);
  });

function renderRecommended(md) {
  const match = md.match(/# Recommend Certificate\s+\*\*(.+?)\*\*/);
  if (!match) return;

  document.getElementById("recommended").innerHTML = `
    <h2>⭐ Recommended Certificate</h2>
    <p>${match[1]}</p>
  `;
}

function renderTable(md) {
  const tableMatch = md.match(/\| Company \|[\s\S]*?\n\n/);
  if (!tableMatch) return;

  const lines = tableMatch[0].trim().split("\n").slice(2);
  let rows = "";

  lines.forEach(line => {
    const cols = line.split("|").map(c => c.trim()).filter(Boolean);
    if (cols.length < 6) return;

    rows += `
      <tr>
        <td>${cols[0]}</td>
        <td>${cols[1]}</td>
        <td class="status revoked">❌ Revoked</td>
        <td>${cols[3]}</td>
        <td>${cols[4]}</td>
        <td>${cols[5]}</td>
      </tr>
    `;
  });

  document.getElementById("certTable").innerHTML = `
    <table class="cert-table">
      <thead>
        <tr>
          <th>Company</th>
          <th>Type</th>
          <th>Status</th>
          <th>Valid From</th>
          <th>Valid To</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderUpdates(md) {
  const section = md.split("# Updates")[1];
  if (!section) return;

  const lines = section.split("\n").filter(l => l.startsWith("**"));

  document.getElementById("updates").innerHTML = `
    <h2>📰 Updates</h2>
    ${lines.map(l => `<div class="update-item">${l}</div>`).join("")}
  `;
}
