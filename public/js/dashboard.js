// ── Admin password ─────────────────────────────────────────────────
// Password is checked client-side. Change this to match your ADMIN_PASSWORD env var.
// For production: replace this with a value injected at build time if needed.
const ADMIN_PASSWORD = window.__ADMIN_PASSWORD__ || 'admin1234';

let allInspections = [];

function checkPassword() {
  const input = document.getElementById('passwordInput').value;
  if (input === ADMIN_PASSWORD) {
    document.getElementById('passwordModal').classList.remove('show');
    document.getElementById('mainContent').style.display = 'block';
    loadInspections();
  } else {
    document.getElementById('passwordError').style.display = 'block';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
  }
}

// ── Load data ───────────────────────────────────────────────────────
async function loadInspections() {
  try {
    const res = await fetch('/.netlify/functions/inspections');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allInspections = await res.json();
    renderStats(allInspections);
    renderTable(allInspections);
  } catch (err) {
    document.getElementById('tableArea').innerHTML = `
      <div class="empty-state">
        <div style="font-size:32px">❌</div>
        <p>Failed to load records: ${err.message}</p>
        <p style="font-size:12px;margin-top:8px">Check that environment variables are configured in Netlify.</p>
      </div>`;
  }
}

// ── Stats ───────────────────────────────────────────────────────────
function renderStats(data) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisMonth = data.filter(r => {
    const d = new Date(r.inspectionDate || r.submittedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisWeek = data.filter(r => new Date(r.inspectionDate || r.submittedAt) >= startOfWeek);
  const totalFindings = data.reduce((sum, r) => sum + (r.noOfFindings || 0), 0);

  document.getElementById('statTotal').textContent = data.length;
  document.getElementById('statFindings').textContent = totalFindings;
  document.getElementById('statThisWeek').textContent = thisWeek.length;
  document.getElementById('statThisMonth').textContent = thisMonth.length;
}

// ── Table ───────────────────────────────────────────────────────────
function renderTable(data) {
  const area = document.getElementById('tableArea');
  if (!data.length) {
    area.innerHTML = `
      <div class="empty-state">
        <div style="font-size:32px">📭</div>
        <p>No inspection records yet.</p>
      </div>`;
    return;
  }

  const rows = data.map((r, i) => {
    const findingsBadgeClass = r.noOfFindings === 0 ? 'badge-0' : r.noOfFindings <= 2 ? 'badge-low' : 'badge-high';
    const wiBadgeClass = r.workNature === 'PM' ? 'badge-pm' : 'badge-cm';
    return `
      <tr>
        <td>${r.inspectionDate || '—'}</td>
        <td>${r.inspectorName || '—'}</td>
        <td>${r.location || '—'}</td>
        <td>${r.contractNo || '—'}</td>
        <td><span class="badge ${wiBadgeClass}">${r.workNature || '—'}</span></td>
        <td><span class="badge ${findingsBadgeClass}">${r.noOfFindings ?? '—'}</span></td>
        <td>
          <button class="btn-view" onclick="openDetail(${i})">View</button>
          ${r.driveLink ? `<a href="${r.driveLink}" target="_blank" class="btn-view" style="margin-left:6px;text-decoration:none">📁 PDF</a>` : ''}
        </td>
      </tr>`;
  }).join('');

  area.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Inspector</th>
          <th>Location</th>
          <th>Contract No.</th>
          <th>Work Nature</th>
          <th>Findings</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Search / filter ─────────────────────────────────────────────────
function filterTable() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  if (!q) { renderTable(allInspections); return; }
  const filtered = allInspections.filter(r =>
    (r.inspectorName || '').toLowerCase().includes(q) ||
    (r.location || '').toLowerCase().includes(q) ||
    (r.contractNo || '').toLowerCase().includes(q) ||
    (r.contractor || '').toLowerCase().includes(q)
  );
  renderTable(filtered);
}

// ── Detail modal ────────────────────────────────────────────────────
function openDetail(idx) {
  const r = allInspections[idx];
  if (!r) return;

  const row = (label, value) => `
    <div class="detail-row">
      <div class="detail-label">${label}</div>
      <div class="detail-value">${value || '—'}</div>
    </div>`;

  document.getElementById('detailBody').innerHTML = `
    <div style="margin-bottom:16px">
      <h4 style="font-size:12px;font-weight:700;color:var(--blue-dark);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Contract &amp; Inspector</h4>
      ${row('Contract No.', r.contractNo)}
      ${row('LV', r.lvBox)}
      ${row('Date', r.inspectionDate)}
      ${row('Time', r.inspectionTime)}
      ${row('Inspector', r.inspectorName)}
    </div>
    <div style="margin-bottom:16px">
      <h4 style="font-size:12px;font-weight:700;color:var(--blue-dark);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Works Details</h4>
      ${row('Location', r.location)}
      ${row('Work Nature', r.workNature)}
      ${row('Contractor', r.contractor)}
      ${row('Name of CP', r.nameOfCp)}
      ${row('Responsible Manager', r.responsibleManager)}
    </div>
    <div style="margin-bottom:16px">
      <h4 style="font-size:12px;font-weight:700;color:var(--blue-dark);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Summary</h4>
      ${row('No. of Findings', `<span style="font-weight:700;color:${r.noOfFindings > 0 ? '#dc2626' : '#16a34a'}">${r.noOfFindings}</span>`)}
      ${row('Submitted At', r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—')}
      ${r.driveLink ? `<div class="detail-row"><div class="detail-label">PDF Report</div><div class="detail-value"><a href="${r.driveLink}" target="_blank" style="color:var(--blue-accent)">📁 Open in Google Drive</a></div></div>` : ''}
    </div>`;

  document.getElementById('detailModal').classList.add('show');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('show');
}

// Close modal on backdrop click
document.getElementById('detailModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('detailModal')) closeDetail();
});

// Allow Enter key on password field
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('passwordInput');
  if (input) input.focus();
});
