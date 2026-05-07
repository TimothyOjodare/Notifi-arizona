/* ============================================================================
 * NotifiAZ — investigator/investigator.js
 *
 * Agency-side inbox. Symmetric counterpart to reporter.js: where the reporter
 * sees their filed reports and any callbacks coming back, the investigator
 * sees incoming reports for their agency and takes action on them.
 *
 * Inbox is filtered to the signed-in investigator's agency only.
 *
 * Actions per delivery state:
 *   submitted         → "Mark received"
 *   received          → "Send callback question" (or close)
 *   callback_pending  → waiting on clinician (read-only)
 *   reply_received    → "Close delivery" (with closure note)
 *   closed            → read-only with closure summary
 * ========================================================================== */

(function () {
    'use strict';

    function _esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g,
            c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    }

    function _relTime(iso) {
        const dt = new Date(iso); const now = new Date();
        const min = Math.round((now - dt) / 60000);
        if (min < 1) return "just now";
        if (min < 60) return `${min}m ago`;
        if (min < 1440) return `${Math.round(min / 60)}h ago`;
        return `${Math.round(min / 1440)}d ago`;
    }

    let _selectedReportId = null;

    function render() {
        const session = window.NA_STORE.getSession();
        if (!session || session.role !== "investigator") return;
        const agencyId = session.agency_id;
        const D = window.NA_DATA || {};
        const agency = window.NA_AUTH.getAgencyById(agencyId);

        // All reports that include this agency in their delivery list
        const allReports = window.NA_STORE.listReports({ destinationId: agencyId });

        const filterEl = document.getElementById("inv-filter-state");
        const stateFilter = filterEl ? filterEl.value : "";

        const filtered = allReports.filter(r => {
            const d = r.deliveries.find(x => x.destination_id === agencyId);
            if (!d) return false;
            if (stateFilter && d.state !== stateFilter) return false;
            return true;
        });

        const inbox = document.getElementById("inv-inbox");
        inbox.innerHTML = `
            <div class="inv-inbox-head">
                <h3>Agency Inbox</h3>
                <small>${_esc(agency ? agency.name : agencyId)} · ${filtered.length} of ${allReports.length} reports</small>
                <select id="inv-filter-state" class="inv-filter">
                    <option value="">All states</option>
                    <option value="submitted" ${stateFilter==='submitted'?'selected':''}>Submitted (action: receive)</option>
                    <option value="received" ${stateFilter==='received'?'selected':''}>Received (action: callback or close)</option>
                    <option value="callback_pending" ${stateFilter==='callback_pending'?'selected':''}>Callback pending</option>
                    <option value="reply_received" ${stateFilter==='reply_received'?'selected':''}>Reply received (action: close)</option>
                    <option value="closed" ${stateFilter==='closed'?'selected':''}>Closed</option>
                </select>
            </div>
            ${filtered.length === 0 ? '<p class="empty-state">No reports match this filter.</p>' :
                filtered.map(r => {
                    const d = r.deliveries.find(x => x.destination_id === agencyId);
                    const subjectName = r.subject_kind === "animal"
                        ? (D.animals.find(a => a.animal_id === r.subject_id)?.name || r.subject_id)
                        : (() => {
                            const p = D.patients.find(p => p.patient_id === r.subject_id);
                            return p ? `${p.name.given[0]} ${p.name.family}` : r.subject_id;
                        })();
                    const disease = D.reportable_diseases.diseases.find(x => x.disease_id === r.disease_id);
                    const isSelected = r.report_id === _selectedReportId;
                    return `
                        <div class="inv-row state-${d.state} ${isSelected ? 'selected' : ''}" data-rid="${_esc(r.report_id)}">
                            <div class="inv-row-l">
                                <strong>${_esc(subjectName)}</strong>
                                <small>${_esc(disease ? disease.common_name : r.disease_id)}</small>
                                <small class="inv-row-time">${_relTime(d.submitted_at)}</small>
                            </div>
                            <span class="state-pill state-${d.state}">${d.state.replace(/_/g, " ")}</span>
                        </div>`;
                }).join("")}`;

        // Wire filter change
        const fEl = document.getElementById("inv-filter-state");
        if (fEl) fEl.addEventListener("change", () => render());

        // Wire row clicks
        inbox.querySelectorAll(".inv-row").forEach(row => {
            row.addEventListener("click", () => {
                _selectedReportId = row.dataset.rid;
                render();   // re-render to update selection
                _renderDetail(_selectedReportId, agencyId);
            });
        });

        // Auto-select the first row if no selection or selection is gone
        if (!_selectedReportId && filtered.length > 0) {
            _selectedReportId = filtered[0].report_id;
            inbox.querySelector(".inv-row")?.classList.add("selected");
            _renderDetail(_selectedReportId, agencyId);
        } else if (_selectedReportId) {
            _renderDetail(_selectedReportId, agencyId);
        } else {
            document.getElementById("inv-detail").innerHTML =
                '<p class="empty-state">No report selected.</p>';
        }
    }

    function _renderDetail(reportId, agencyId) {
        const detail = document.getElementById("inv-detail");
        const session = window.NA_STORE.getSession();
        const r = window.NA_STORE.getReport(reportId);
        if (!r) {
            detail.innerHTML = '<p class="empty-state">Report not found.</p>';
            return;
        }
        const D = window.NA_DATA || {};
        const d = r.deliveries.find(x => x.destination_id === agencyId);
        const disease = D.reportable_diseases.diseases.find(x => x.disease_id === r.disease_id);
        const reporter = window.NA_AUTH.getProviderById(r.reporter_id);
        const isAnimal = r.subject_kind === "animal";
        const subject = isAnimal
            ? D.animals.find(a => a.animal_id === r.subject_id)
            : D.patients.find(p => p.patient_id === r.subject_id);

        if (!subject) {
            detail.innerHTML = '<p class="empty-state">Subject record not in dataset.</p>';
            return;
        }

        const subjectName = isAnimal
            ? `${subject.name} (${subject.species})`
            : `${subject.name.given[0]} ${subject.name.family}`;
        const subjectMeta = isAnimal
            ? `Owner: ${subject.owner.name} · ${subject.owner.address?.city || ""}, AZ`
            : `${subject.sex}, ${subject.age}y · ${subject.address.city}, AZ ${subject.address.postalCode} · MRN ${subject.patient_id}`;

        // Build the action panel based on state
        let actionPanel = "";
        if (d.state === "submitted") {
            actionPanel = `
                <div class="inv-actions">
                    <h4>Action: confirm receipt</h4>
                    <p>Mark this report as received once your agency intake system has logged it.</p>
                    <button class="btn-primary" id="act-receive">✓ Mark received</button>
                </div>`;
        } else if (d.state === "received") {
            actionPanel = `
                <div class="inv-actions">
                    <h4>Action: investigate</h4>
                    <p>Send a callback question to the reporting clinician, or close the case if no further information is needed.</p>
                    <textarea id="callback-text" placeholder="Type your question to the clinician — e.g., 'Confirm the patient's exact soil-dust exposure timing'..."></textarea>
                    <div class="action-row">
                        <button class="btn-primary" id="act-callback">Send callback</button>
                        <button class="btn-secondary" id="act-close-direct">Close without callback</button>
                    </div>
                </div>`;
        } else if (d.state === "callback_pending") {
            actionPanel = `
                <div class="inv-actions waiting">
                    <h4>Awaiting reply from clinician</h4>
                    <p><strong>Question sent:</strong></p>
                    <p class="quoted">${_esc(d.callback.question)}</p>
                    <small>Sent ${_relTime(d.callback.sent_at)}. The clinician will see this in their NotifiAZ inbox the next time they sign in.</small>
                </div>`;
        } else if (d.state === "reply_received") {
            actionPanel = `
                <div class="inv-actions">
                    <h4>Reply received — close case</h4>
                    <p><strong>Your question:</strong></p>
                    <p class="quoted">${_esc(d.callback.question)}</p>
                    <p><strong>Clinician's reply:</strong></p>
                    <p class="quoted reply">${_esc(d.callback.reply)}</p>
                    <small>Replied ${_relTime(d.callback.replied_at)}.</small>
                    <textarea id="closure-text" placeholder="Closure note — e.g., 'Case confirmed; no further investigation required.'"></textarea>
                    <div class="action-row">
                        <button class="btn-primary" id="act-close">Close delivery</button>
                    </div>
                </div>`;
        } else if (d.state === "closed") {
            actionPanel = `
                <div class="inv-actions closed">
                    <h4>✓ Case closed</h4>
                    <p>${_esc(d.closure_note || "(no closure note)")}</p>
                    <small>Closed ${_relTime(d.closed_at)}${d.closed_by ? ' by ' + _esc(d.closed_by) : ''}.</small>
                    ${d.callback?.question ? `
                        <details class="closure-history">
                            <summary>Callback history</summary>
                            <p><strong>Q:</strong> ${_esc(d.callback.question)}</p>
                            ${d.callback.reply ? `<p><strong>A:</strong> ${_esc(d.callback.reply)}</p>` : ''}
                        </details>` : ''}
                </div>`;
        }

        // Render the message preview (what was sent)
        const messagePreview = d.message_content
            ? `<details class="msg-preview">
                   <summary>📨 Message we received (${_esc(d.message_format || 'unknown format')})</summary>
                   <pre class="preview-content">${_esc(d.message_content)}</pre>
               </details>`
            : `<small class="msg-missing">Original message content not available (this is a seed report).</small>`;

        // Subject summary
        const subjectSummary = isAnimal ? `
            <section class="inv-section">
                <h4>Subject details</h4>
                <p><strong>Animal:</strong> ${_esc(subject.name)} · ${_esc(subject.species)}</p>
                <p><strong>Owner / premises:</strong> ${_esc(subject.owner.name)} · ${_esc(subject.owner.address?.city || '')}, ${_esc(subject.owner.address?.county || '')} County, AZ</p>
                <p><strong>Encounter date:</strong> ${_esc(subject.encounter_date)}</p>
                <p><strong>Chief complaint:</strong> ${_esc(subject.chief_complaint)}</p>
                <p><strong>HPI:</strong> ${_esc(subject.hpi)}</p>
                <p><strong>Plan:</strong> ${_esc(subject.plan)}</p>
                ${subject.lab_results?.length ? `
                    <h5>Labs</h5>
                    <ul>${subject.lab_results.map(l => `<li>${_esc(l.name)}: ${_esc(l.value)} ${l.abnormal ? '<span class="abn-pill">ABN</span>' : ''}</li>`).join("")}</ul>` : ''}
            </section>` : `
            <section class="inv-section">
                <h4>Patient details</h4>
                <p><strong>${_esc(subjectName)}</strong> · ${_esc(subjectMeta)}</p>
                <p><strong>Race:</strong> ${_esc(subject.race)} · <strong>Ethnicity:</strong> ${_esc(subject.ethnicity)}</p>
                ${subject.tribal_residency ? `<p><strong>Tribal affiliation:</strong> ${_esc(subject.tribal_residency.replace('tribal_', ''))}</p>` : ''}
                <p><strong>Visit date:</strong> ${_esc(subject.encounters[0]?.date)}</p>
                <p><strong>HPI:</strong> ${_esc(subject.encounters[0]?.hpi)}</p>
                <p><strong>Assessment:</strong> ${_esc(subject.encounters[0]?.assessment)}</p>
                <p><strong>Plan:</strong> ${_esc(subject.encounters[0]?.plan)}</p>
                ${subject.exposure_history && Object.keys(subject.exposure_history).length ? `
                    <h5>Exposure history</h5>
                    <ul>${Object.entries(subject.exposure_history).map(([k, v]) => `<li><strong>${_esc(k)}:</strong> ${_esc(String(v))}</li>`).join("")}</ul>
                ` : ''}
                ${subject.lab_results?.length ? `
                    <h5>Labs</h5>
                    <ul>${subject.lab_results.map(l => `<li>${_esc(l.name)} (LOINC ${_esc(l.loinc || '—')}): ${_esc(l.value)} ${l.abnormal ? '<span class="abn-pill">ABN</span>' : ''}</li>`).join("")}</ul>` : ''}
                ${subject.contacts != null ? `<p><strong>Reported contacts:</strong> ${subject.contacts}</p>` : ''}
            </section>`;

        detail.innerHTML = `
            <div class="inv-detail-head">
                <h3>${_esc(disease ? disease.common_name : r.disease_id)}</h3>
                <span class="state-pill state-${d.state}">${d.state.replace(/_/g, " ")}</span>
            </div>
            <p class="inv-meta">
                <strong>Report:</strong> ${_esc(r.report_id)} ·
                <strong>Ack:</strong> <code>${_esc(d.ack_id)}</code> ·
                <strong>Submitted:</strong> ${_relTime(d.submitted_at)}
            </p>
            <p class="inv-meta">
                <strong>Reporter:</strong> ${_esc(reporter ? reporter.name : r.reporter_id)} · ${_esc(reporter?.facility_name || "")}
            </p>

            ${subjectSummary}

            ${actionPanel}

            ${messagePreview}
        `;

        // Wire action buttons
        const recvBtn = document.getElementById("act-receive");
        if (recvBtn) recvBtn.addEventListener("click", () => {
            window.NA_STORE.markReceived(reportId, agencyId, session.user_id);
            render();
        });

        const cbBtn = document.getElementById("act-callback");
        if (cbBtn) cbBtn.addEventListener("click", () => {
            const ta = document.getElementById("callback-text");
            const text = (ta.value || "").trim();
            if (!text) { alert("Please type a callback question."); return; }
            window.NA_STORE.sendCallback(reportId, agencyId, session.user_id, text);
            render();
        });

        const closeDirectBtn = document.getElementById("act-close-direct");
        if (closeDirectBtn) closeDirectBtn.addEventListener("click", () => {
            const note = prompt("Closure note (optional):") || "Closed without callback. Case complete.";
            window.NA_STORE.closeDelivery(reportId, agencyId, session.user_id, note);
            render();
        });

        const closeBtn = document.getElementById("act-close");
        if (closeBtn) closeBtn.addEventListener("click", () => {
            const ta = document.getElementById("closure-text");
            const note = (ta.value || "").trim() || "Case closed; reply received and reviewed.";
            window.NA_STORE.closeDelivery(reportId, agencyId, session.user_id, note);
            render();
        });
    }

    window.NA_INV = { render };
})();
