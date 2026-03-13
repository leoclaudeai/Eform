// ── Photo handling ──────────────────────────────────────────────────
const photoData = { 1: [], 2: [], 3: [], 4: [], 5: [] };

function handlePhotoUpload(input, previewId) {
  const findingNum = parseInt(previewId.replace('preview', ''));
  const preview = document.getElementById(previewId);
  Array.from(input.files).forEach(file => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      photoData[findingNum].push({ name: file.name, base64: e.target.result, type: file.type });
      if (file.type.startsWith('image/')) {
        const wrap = document.createElement('div');
        wrap.className = 'photo-remove';
        const img = document.createElement('img');
        img.src = e.target.result;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '×';
        const idx = photoData[findingNum].length - 1;
        btn.onclick = () => {
          photoData[findingNum].splice(idx, 1);
          wrap.remove();
        };
        wrap.appendChild(img);
        wrap.appendChild(btn);
        preview.appendChild(wrap);
      }
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

// ── Findings count ──────────────────────────────────────────────────
let findingsCount = 0;

function changeFindingsCount(delta) {
  findingsCount = Math.max(0, Math.min(5, findingsCount + delta));
  document.getElementById('findingsDisplay').textContent = findingsCount;
  document.getElementById('noOfFindings').value = findingsCount;
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('finding' + i);
    el.classList.toggle('visible', i <= findingsCount);
  }
}

// ── Get radio value ─────────────────────────────────────────────────
function getRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : '';
}

// ── Collect all form data ───────────────────────────────────────────
function collectFormData() {
  const f = document.getElementById('inspectionForm');
  const get = id => (f.querySelector(`#${id}`) || f.querySelector(`[name="${id}"]`) || {}).value || '';

  const data = {
    contractNo:          document.getElementById('contractNo').value.trim(),
    lvBox:               document.getElementById('lvBox').value.trim(),
    inspectionDate:      document.getElementById('inspectionDate').value,
    inspectionTime:      document.getElementById('inspectionTime').value,
    inspectorName:       document.getElementById('inspectorName').value.trim(),
    location:            document.getElementById('location').value.trim(),
    workNature:          document.getElementById('workNature').value,
    contractNoDetails:   document.getElementById('contractNoDetails').value.trim(),
    contractor:          document.getElementById('contractor').value.trim(),
    nameOfCp:            document.getElementById('nameOfCp').value.trim(),
    responsibleManager:  document.getElementById('responsibleManager').value.trim(),
    // Audit
    preAudit1: getRadio('preAudit1'), preAudit2: getRadio('preAudit2'),
    preAudit3: getRadio('preAudit3'), preAudit4: getRadio('preAudit4'),
    comp1: getRadio('comp1'), comp2: getRadio('comp2'), comp3: getRadio('comp3'),
    comp4: getRadio('comp4'), comp5: getRadio('comp5'), comp6: getRadio('comp6'),
    comp7: getRadio('comp7'), comp8: getRadio('comp8'),
    eff1: getRadio('eff1'), eff2: getRadio('eff2'), eff3: getRadio('eff3'),
    eff4: getRadio('eff4'), eff5: getRadio('eff5'),
    wi1: getRadio('wi1'), wi2: getRadio('wi2'), wi3: getRadio('wi3'),
    wi4: getRadio('wi4'), wi5: getRadio('wi5'),
    ws1: getRadio('ws1'), ws2: getRadio('ws2'), ws3: getRadio('ws3'),
    noOfFindings: findingsCount,
    // Findings
    findings: [],
    submissionDate: new Date().toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' }),
  };

  for (let i = 1; i <= findingsCount; i++) {
    data.findings.push({
      findings:   (document.querySelector(`[name="finding${i}_findings"]`) || {}).value || '',
      actions:    (document.querySelector(`[name="finding${i}_actions"]`) || {}).value || '',
      actionBy:   (document.querySelector(`[name="finding${i}_actionBy"]`) || {}).value || '',
      photos:     photoData[i],
    });
  }
  return data;
}

// ── Validate ────────────────────────────────────────────────────────
function validate(data) {
  if (!data.contractNo)    { showToast('Contract Number is required', 'error'); return false; }
  if (!data.inspectionDate) { showToast('Date of Inspection is required', 'error'); return false; }
  if (!data.inspectionTime) { showToast('Time of Inspection is required', 'error'); return false; }
  if (!data.inspectorName)  { showToast('Name of Inspector is required', 'error'); return false; }
  if (!data.location)       { showToast('Location is required', 'error'); return false; }
  if (!data.workNature)     { showToast('Work Nature is required', 'error'); return false; }
  return true;
}

// ── Generate PDF with jsPDF (no DOM rendering) ─────────────────────
async function generatePdf(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const W = 210, M = 10, CW = W - M * 2;
  let y = M;

  // ── Helpers ──────────────────────────────────────────────────────
  const checkPage = (needed = 10) => {
    if (y + needed > 285) { doc.addPage(); y = M; }
  };

  const hLine = (yPos, x1 = M, x2 = W - M, r = 226, g = 232, b = 240) => {
    doc.setDrawColor(r, g, b); doc.setLineWidth(0.2);
    doc.line(x1, yPos, x2, yPos);
  };

  const sectionTitle = (title) => {
    checkPage(14);
    doc.setFillColor(239, 246, 255);
    doc.rect(M, y, CW, 7, 'F');
    doc.setDrawColor(37, 99, 235); doc.setLineWidth(1);
    doc.line(M, y, M, y + 7);
    doc.setLineWidth(0.2);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 58, 107);
    doc.text(title.toUpperCase(), M + 3, y + 4.8);
    y += 7;
  };

  const labelVal = (label, value, x, yPos, lw = 45) => {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, yPos);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(String(value || ''), CW / 2 - lw - 2);
    doc.text(lines, x + lw, yPos);
    return lines.length;
  };

  const auditRow = (question, answer, x = M, w = CW) => {
    checkPage(12);
    const qLines = doc.splitTextToSize(question, w * 0.70 - 4);
    const rowH = Math.max(qLines.length * 4 + 4, 8);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, rowH, 'F');
    hLine(y + rowH, x, x + w);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
    doc.text(qLines, x + 2, y + 5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(answer || ''), x + w * 0.73, y + 5);
    y += rowH;
  };

  const auditRow2col = (q1, a1, q2, a2) => {
    checkPage(12);
    const hw = CW / 2 - 1;
    const q1Lines = doc.splitTextToSize(q1, hw * 0.70 - 4);
    const q2Lines = doc.splitTextToSize(q2, hw * 0.70 - 4);
    const rowH = Math.max(q1Lines.length, q2Lines.length) * 4 + 4;
    hLine(y + rowH, M, W - M);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
    doc.text(q1Lines, M + 2, y + 5);
    doc.setTextColor(71, 85, 105); doc.text(String(a1 || ''), M + hw * 0.73, y + 5);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.line(M + hw + 1, y, M + hw + 1, y + rowH);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal');
    doc.text(q2Lines, M + hw + 3, y + 5);
    doc.setTextColor(71, 85, 105); doc.text(String(a2 || ''), M + hw + hw * 0.73, y + 5);
    y += rowH;
  };

  // ── Header ────────────────────────────────────────────────────────
  doc.setFillColor(26, 58, 107);
  doc.rect(M, y, CW, 16, 'F');
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('FMD Technical Inspection Record', M + 6, y + 7);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('\u8a2d\u65bd\u7dad\u4fee\u90e8\u627f\u8fa6\u5546\u5408\u7d04\u6aa2\u67e5\u7d00\u9304', M + 6, y + 13);
  y += 16;

  // ── Contract Number ───────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(M, y, CW, 10, 'F');
  hLine(y + 10);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 58, 107);
  doc.text('CONTRACT NUMBER', M + 2, y + 4.5);
  doc.setFontSize(10); doc.setTextColor(220, 38, 38);
  doc.text(`Outsourced   ${data.contractNo || ''}`, M + 2, y + 9);
  // LV box
  doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.8);
  doc.rect(W - M - 25, y + 1, 23, 8);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38);
  doc.text('LV', W - M - 13.5, y + 4.5, { align: 'center' });
  doc.setFontSize(9); doc.text(data.lvBox || '', W - M - 13.5, y + 8, { align: 'center' });
  y += 10;

  // ── Date & Inspector ──────────────────────────────────────────────
  sectionTitle('Date & Inspector');
  const diRows = [
    ['Date of inspection', data.inspectionDate],
    ['Time of inspection', data.inspectionTime],
    ['Name of Inspector',  data.inspectorName],
  ];
  diRows.forEach(([lbl, val]) => {
    checkPage(8);
    doc.setFillColor(255, 255, 255); doc.rect(M, y, CW, 8, 'F'); hLine(y + 8);
    labelVal(lbl, val, M + 2, y + 5.5);
    y += 8;
  });

  // ── Works Details ─────────────────────────────────────────────────
  sectionTitle('Works Details');
  const wdRows = [
    ['Location', data.location, 'Work Nature (PM/CM)', data.workNature],
    ['Contract No.', data.contractNoDetails || data.contractNo, 'Contractor', data.contractor],
    ['Name of CP', data.nameOfCp, 'Responsible Manager (MTR)', data.responsibleManager],
  ];
  wdRows.forEach(([l1, v1, l2, v2]) => {
    checkPage(8);
    doc.setFillColor(255, 255, 255); doc.rect(M, y, CW, 8, 'F'); hLine(y + 8);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.line(M + CW / 2, y, M + CW / 2, y + 8);
    labelVal(l1, v1, M + 2, y + 5.5, 35);
    labelVal(l2, v2, M + CW / 2 + 2, y + 5.5, 45);
    y += 8;
  });

  // ── Pre-audit ─────────────────────────────────────────────────────
  sectionTitle('Audit Items (Pre-audit)');
  auditRow2col('PM WI/ Check sheet follows the review requirement?', data.preAudit1, 'PM WI/ Check sheet follows the latest regulations and standards of particular system?', data.preAudit2);
  auditRow2col('Is the related JHA valid?', data.preAudit3, 'Is the WI/ check sheets latest updated version?', data.preAudit4);

  // ── Competency ────────────────────────────────────────────────────
  sectionTitle('Audit Items (Competency)');
  [
    ['Do maintenance personnel obtain required competence to perform the work? (Check the record of qualification and working experience of the personnel)', data.comp1],
    ['Is the number of staff sufficient for the workload?', data.comp2],
    ['Do maintenance personnel have adequate time for completing the planned works?', data.comp3],
    ['Do personnel understand the procedure?', data.comp4],
    ['Do personnel follow the procedures detailed in the WI when conducting works?', data.comp5],
    ['Do maintenance personnel have special tools and equipment properly calibrated & properly used?', data.comp6],
    ['Does the maintenance personnel subcontract any part of the work?', data.comp7],
    ['If sub-contractor in-place are all subcontractor arrangements using the same procedures as for MTR approved ones?', data.comp8],
  ].forEach(([q, a]) => auditRow(q, a));

  // ── Effectiveness ─────────────────────────────────────────────────
  sectionTitle('Audit Items (Effectiveness)');
  [
    ['Are the procedures or methods used effective with no stipulated steps?', data.eff1],
    ['Is space sufficient for the work?', data.eff2],
    ['Is a written procedure in place to address the action required for unaccepted test result? Failure reasons and repair actions should be recorded in check sheet clearly.', data.eff3],
    ["If there's deficiencies identified by test, any corrective action taken in a timely and safe manner before further use?", data.eff4],
    ['Can the maintenance results be clearly indicated in the maintenance/ inspection records?', data.eff5],
  ].forEach(([q, a]) => auditRow(q, a));

  // ── WI Verification ───────────────────────────────────────────────
  sectionTitle('Audit Items (WI Verification)');
  [
    ['Do the WI procedures involve any SCI?', data.wi1],
    ['Do the WI procedures indicate the correct performance of critical maintenance tasks (ie. SCI) if applicable?', data.wi2],
    ['Do the WI procedures involve any fingering procedure?', data.wi3],
    ['Do the WI procedures indicate clearly and practically the correct performance of fingering procedure if applicable?', data.wi4],
    ['Is the WI procedure practical for work?', data.wi5],
  ].forEach(([q, a]) => auditRow(q, a));

  // ── Worksite ──────────────────────────────────────────────────────
  sectionTitle('Audit Items (Worksite)');
  [
    ['Is the working place clean and tidy?', data.ws1],
    ['Is the workplace place safe without any hazard?', data.ws2],
    ['Do the maintenance personnel follow the policies and procedures for parts & material control?', data.ws3],
  ].forEach(([q, a]) => auditRow(q, a));

  // ── No. of Findings ───────────────────────────────────────────────
  checkPage(20);
  sectionTitle('No. of Findings');
  doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.8);
  doc.rect(M + 2, y + 2, 20, 16);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38);
  doc.text(String(data.noOfFindings || 0), M + 12, y + 14, { align: 'center' });
  y += 20;

  // ── Findings ──────────────────────────────────────────────────────
  data.findings.forEach((f, i) => {
    checkPage(40);
    sectionTitle(`Finding (${i + 1})`);
    const findingRows = [
      ['Findings', f.findings],
      ['Improvement Actions', f.actions],
      ['Action By', f.actionBy],
    ];
    findingRows.forEach(([lbl, val]) => {
      const lines = doc.splitTextToSize(val || '', CW - 52);
      const rowH = Math.max(lines.length * 4 + 4, 8);
      checkPage(rowH + 2);
      doc.setFillColor(255, 255, 255); doc.rect(M, y, CW, rowH, 'F'); hLine(y + rowH);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(lbl, M + 2, y + 5);
      doc.setTextColor(30, 41, 59);
      doc.text(lines, M + 50, y + 5);
      y += rowH;
    });
    // Photos
    const imgPhotos = f.photos.filter(p => p.type && p.type.startsWith('image/'));
    if (imgPhotos.length > 0) {
      checkPage(12);
      doc.setFillColor(255, 255, 255); doc.rect(M, y, CW, 8, 'F'); hLine(y + 8);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text('Photos/Videos', M + 2, y + 5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${imgPhotos.length} photo(s) attached`, M + 50, y + 5);
      y += 8;
      // Add photos
      let px = M + 2;
      imgPhotos.forEach(p => {
        checkPage(42);
        if (px + 42 > W - M) { px = M + 2; y += 42; checkPage(42); }
        try {
          const fmt = p.type.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(p.base64, fmt, px, y, 38, 38);
        } catch (_) { /* skip invalid images */ }
        px += 42;
      });
      if (imgPhotos.length > 0) y += 42;
    }
  });

  // ── Footer ────────────────────────────────────────────────────────
  checkPage(14);
  doc.setFillColor(248, 250, 252); doc.rect(M, y, CW, 10, 'F');
  hLine(y); hLine(y + 10);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text('Date of Submission', M + 2, y + 6);
  doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'bold');
  doc.text(data.submissionDate || '', M + 38, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text('Submitted By', M + CW / 2 + 2, y + 6);
  doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'bold');
  doc.text(data.inspectorName || '', M + CW / 2 + 28, y + 6);

  return doc.output('datauristring').split(',')[1]; // base64
}

// ── Build PDF HTML (no longer used — kept for reference) ───────────
function buildPdfHtml(data) {
  const auditRow = (q, a) => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:10.5px;width:70%">${q}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:10.5px">${a || ''}</td>
    </tr>`;

  const auditRow2col = (q1, a1, q2, a2) => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:10.5px;width:35%">${q1}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:10.5px;width:15%">${a1 || ''}</td>
      <td style="width:1px;background:#e2e8f0;border-bottom:1px solid #e2e8f0"></td>
      <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:10.5px;width:35%">${q2}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:10.5px;width:15%">${a2 || ''}</td>
    </tr>`;

  const sectionHeader = title => `
    <div style="margin-top:18px;margin-bottom:0">
      <h3 style="font-size:12px;font-weight:700;color:#1a3a6b;text-transform:uppercase;
                 letter-spacing:.04em;padding:8px 10px;border-left:4px solid #2563eb;
                 background:#eff6ff;margin:0">${title}</h3>
    </div>`;

  const detailsTable = () => `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0">
      <tr>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b;width:160px;border-bottom:1px solid #e2e8f0">Location</td>
        <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0">${data.location}</td>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b;width:160px;border-bottom:1px solid #e2e8f0">Work Nature (PM/CM)</td>
        <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0">${data.workNature}</td>
      </tr>
      <tr>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0">Contract No.</td>
        <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0">${data.contractNoDetails || data.contractNo}</td>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0">Contractor</td>
        <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0">${data.contractor}</td>
      </tr>
      <tr>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b">Name of CP</td>
        <td style="padding:7px 10px;font-size:10.5px;border-right:1px solid #e2e8f0">${data.nameOfCp}</td>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b">Responsible Manager (MTR)</td>
        <td style="padding:7px 10px;font-size:10.5px">${data.responsibleManager}</td>
      </tr>
    </table>`;

  let findingsHtml = '';
  data.findings.forEach((f, i) => {
    const photosHtml = f.photos.filter(p => p.type.startsWith('image/')).map(p =>
      `<img src="${p.base64}" style="width:120px;height:90px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;margin:4px">`
    ).join('');
    findingsHtml += `
      <div style="page-break-inside:avoid">
        ${sectionHeader(`Finding (${i + 1})`)}
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0">
          <tr>
            <td style="padding:7px 10px;font-size:10.5px;color:#64748b;width:160px;border-bottom:1px solid #e2e8f0;vertical-align:top">Findings</td>
            <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;min-height:50px">${f.findings || ''}</td>
          </tr>
          <tr>
            <td style="padding:7px 10px;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0;vertical-align:top">Improvement Actions</td>
            <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;min-height:50px">${f.actions || ''}</td>
          </tr>
          <tr>
            <td style="padding:7px 10px;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0">Action By</td>
            <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0">${f.actionBy || ''}</td>
          </tr>
          <tr>
            <td style="padding:7px 10px;font-size:10.5px;color:#64748b;vertical-align:top">Photos/Videos</td>
            <td style="padding:7px 10px">${photosHtml || '<span style="color:#94a3b8;font-size:10px">No photos attached</span>'}</td>
          </tr>
        </table>
      </div>`;
  });

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1e293b;width:680px;margin:0 auto">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a3a6b,#1e4d9b,#2563eb);padding:18px 24px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:16px;color:#fff;margin-bottom:0">
      <div style="width:44px;height:44px;background:rgba(255,255,255,.18);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📝</div>
      <div>
        <div style="font-size:16px;font-weight:700;line-height:1.2">FMD Technical Inspection Record</div>
        <div style="font-size:11px;opacity:.8;margin-top:2px">設施維修部承辦商合約檢查紀錄</div>
      </div>
    </div>

    <!-- Contract Number -->
    <div style="padding:12px 16px;background:#fff;border:1px solid #e2e8f0;border-top:none;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-weight:700;color:#1a3a6b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Contract Number</div>
        <div style="font-size:13px;font-weight:600;color:#dc2626">Outsourced &nbsp; ${data.contractNo}</div>
      </div>
      <div style="border:2px solid #dc2626;border-radius:4px;padding:6px 20px;text-align:center;min-width:80px">
        <div style="font-size:10px;color:#dc2626;font-weight:700">LV</div>
        <div style="font-size:12px;font-weight:700;color:#dc2626">${data.lvBox || ''}</div>
      </div>
    </div>

    <!-- Date & Inspector -->
    ${sectionHeader('Date &amp; Inspector')}
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
      <tr>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b;width:180px;border-bottom:1px solid #e2e8f0">Date of inspection</td>
        <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0">${data.inspectionDate}</td>
      </tr>
      <tr>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0">Time of inspection</td>
        <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0">${data.inspectionTime}</td>
      </tr>
      <tr>
        <td style="padding:7px 10px;font-size:10.5px;color:#64748b">Name of Inspector</td>
        <td style="padding:7px 10px;font-size:10.5px">${data.inspectorName}</td>
      </tr>
    </table>

    <!-- Works Details -->
    ${sectionHeader('Works Details')}
    <div style="border:1px solid #e2e8f0;border-top:none">${detailsTable()}</div>

    <!-- Pre-audit -->
    ${sectionHeader('Audit Items (Pre-audit)')}
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
      ${auditRow2col('PM WI/ Check sheet follows the review requirement?', data.preAudit1, 'PM WI/ Check sheet follows the latest regulations and standards of particular system?', data.preAudit2)}
      ${auditRow2col('Is the related JHA valid?', data.preAudit3, 'Is the WI/ check sheets latest updated version?', data.preAudit4)}
    </table>

    <!-- Competency -->
    ${sectionHeader('Audit Items (Competency)')}
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
      ${auditRow('Do maintenance personnel obtain required competence to perform the work? (Check the record of qualification and working experience of the personnel)', data.comp1)}
      ${auditRow('Is the number of staff sufficient for the workload?', data.comp2)}
      ${auditRow('Do maintenance personnel have adequate time for completing the planned works?', data.comp3)}
      ${auditRow('Do personnel understand the procedure?', data.comp4)}
      ${auditRow('Do personnel follow the procedures detailed in the WI when conducting works?', data.comp5)}
      ${auditRow('Do maintenance personnel have special tools and equipment properly calibrated &amp; properly used?', data.comp6)}
      ${auditRow('Does the maintenance personnel subcontract any part of the work?', data.comp7)}
      ${auditRow('If sub-contractor in-place are all subcontractor arrangements using the same procedures as for MTR approved ones?', data.comp8)}
    </table>

    <!-- Effectiveness -->
    ${sectionHeader('Audit Items (Effectiveness)')}
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
      ${auditRow('Are the procedures or methods used effective with no stipulated steps?', data.eff1)}
      ${auditRow('Is space sufficient for the work?', data.eff2)}
      ${auditRow('Is a written procedure in place to address the action required for unaccepted test result? Failure reasons and repair actions should be recorded in check sheet clearly.', data.eff3)}
      ${auditRow("If there's deficiencies identified by test, any corrective action taken in a timely and safe manner before further use?", data.eff4)}
      ${auditRow('Can the maintenance results be clearly indicated in the maintenance/ inspection records?', data.eff5)}
    </table>

    <!-- WI Verification -->
    ${sectionHeader('Audit Items (WI Verification)')}
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
      ${auditRow('Do the WI procedures involve any SCI?', data.wi1)}
      ${auditRow('Do the WI procedures indicate the correct performance of critical maintenance tasks (ie. SCI) if applicable?', data.wi2)}
      ${auditRow('Do the WI procedures involve any fingering procedure?', data.wi3)}
      ${auditRow('Do the WI procedures indicate clearly and practically the correct performance of fingering procedure if applicable?', data.wi4)}
      ${auditRow('Is the WI procedure practical for work?', data.wi5)}
    </table>

    <!-- Worksite -->
    ${sectionHeader('Audit Items (Worksite)')}
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
      ${auditRow('Is the working place clean and tidy?', data.ws1)}
      ${auditRow('Is the workplace place safe without any hazard?', data.ws2)}
      ${auditRow('Do the maintenance personnel follow the policies and procedures for parts &amp; material control?', data.ws3)}
    </table>

    <!-- No. of Findings -->
    ${sectionHeader('No. of Findings')}
    <div style="border:1px solid #e2e8f0;border-top:none;padding:16px">
      <div style="width:80px;height:80px;border:2px solid #dc2626;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#dc2626">${data.noOfFindings}</div>
    </div>

    ${findingsHtml}

    <!-- Footer -->
    <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 6px 6px;display:flex;justify-content:space-between;font-size:10.5px">
      <div><span style="color:#64748b">Date of Submission &nbsp;</span><span style="color:#475569">${data.submissionDate}</span></div>
      <div><span style="color:#64748b">Submitted By &nbsp;</span><span style="color:#475569">${data.inspectorName}</span></div>
    </div>

  </div>`;
}

// ── Submit ──────────────────────────────────────────────────────────
document.getElementById('inspectionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = collectFormData();
  if (!validate(data)) return;

  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  const submitBtn = document.getElementById('submitBtn');

  overlay.classList.add('show');
  submitBtn.disabled = true;
  loadingText.textContent = 'Generating PDF...';

  try {
    const pdfBase64 = await generatePdf(data);
    loadingText.textContent = 'Uploading to Google Drive & sending email...';

    const res = await fetch('/.netlify/functions/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData: data, pdfBase64 }),
    });

    const result = await res.json();
    overlay.classList.remove('show');
    submitBtn.disabled = false;

    if (result.success) {
      document.getElementById('formWrap').style.display = 'none';
      const successScreen = document.getElementById('successScreen');
      successScreen.classList.add('show');
      if (result.driveLink) {
        const wrap = document.getElementById('driveLinkWrap');
        document.getElementById('driveLinkBtn').href = result.driveLink;
        wrap.style.display = 'block';
      }
    } else {
      showToast('Submission failed: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    overlay.classList.remove('show');
    submitBtn.disabled = false;
    showToast('Network error: ' + err.message, 'error');
  }
});

// ── Reset ───────────────────────────────────────────────────────────
function resetForm() {
  document.getElementById('inspectionForm').reset();
  findingsCount = 0;
  document.getElementById('findingsDisplay').textContent = '0';
  document.getElementById('noOfFindings').value = '0';
  for (let i = 1; i <= 5; i++) {
    document.getElementById('finding' + i).classList.remove('visible');
    document.getElementById('preview' + i).innerHTML = '';
    photoData[i] = [];
  }
  document.getElementById('formWrap').style.display = 'block';
  document.getElementById('successScreen').classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Toast ───────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 4000);
}

// ── Set default date to today ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inspectionDate').value = today;
});
