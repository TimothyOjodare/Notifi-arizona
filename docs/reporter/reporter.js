/* ============================================================================
 * NotifiAZ — reporter/reporter.js
 *
 * The clinician/vet-facing reporter. Two flows:
 *
 *   Flow A (EHR-launched): window._NA_LAUNCH_SUBJECT is set by the EHR's
 *     launch button. We pre-fill from the patient/animal and compute the
 *     destination set automatically. One-click submit.
 *
 *   Flow B (standalone): no subject pre-loaded. Show a picker so the
 *     clinician can choose from their patients/animals.
 *
 * The right panel shows "my filed reports" — listReports({reporterId}).
 * Each report shows its delivery state per destination, including any
 * agency callbacks. Replying to a callback is one click.
 * ========================================================================== */

(function () {
    'use strict';

    function _esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g,
            c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    }

    // Resolve the disease entry's destination list to actual agency IDs
    function _resolveDestinations(disease, subject, kind) {
        if (!disease) return [];
        const agencies = ((window.NA_DATA || {}).providers || {}).agencies || [];
        const known = new Set(agencies.map(a => a.id));
        const out = [];

        if (kind === "human") {
            const list = (disease.human_reporting && disease.human_reporting.destinations) || [];
            const county = subject.address?.county;
            list.forEach(d => {
                if (d === "adhs") out.push("adhs");
                else if (d === "cdc_nndss") out.push("cdc_nndss");
                else if (d === "local_health_dept") {
                    const cid = `county_${(county || "").toLowerCase()}`;
                    if (known.has(cid)) out.push(cid);
                }
                else if (d === "tribal_if_applicable") {
                    if (subject.tribal_residency) out.push(subject.tribal_residency);
                }
            });
        } else {
            const list = (disease.animal_reporting && disease.animal_reporting.destinations) || [];
            list.forEach(d => {
                if (d === "ada") out.push("az_ada");
                else if (d === "aphis") out.push("usda_aphis");
                else if (d === "azgfd") out.push("az_gfd");
            });
            // Wildlife always to AGFD
            if (subject.is_wildlife && !out.includes("az_gfd")) out.push("az_gfd");
            // Cross-species: if zoonotic, ADHS gets a parallel notification
            if (subject.active_problems?.[0]?.is_zoonotic && !out.includes("adhs")) {
                out.push("adhs");
            }
        }
        // Dedupe preserving order
        return Array.from(new Set(out));
    }

    function render() {
        const session = window.NA_STORE.getSession();
        if (!session) return;
        _renderForm();
        _renderSidePanel();
    }

    function _renderForm() {
        const main = document.getElementById("reporter-main");
        const launch = window._NA_LAUNCH_SUBJECT;
        if (!launch) {
            // Standalone mode — picker
            _renderStandalonePicker(main);
            return;
        }
        const D = window.NA_DATA || {};
        const session = window.NA_STORE.getSession();
        const reporter = window.NA_AUTH.getProviderById(session.user_id);

        const subject = launch.kind === "animal"
            ? D.animals.find(a => a.animal_id === launch.id)
            : D.patients.find(p => p.patient_id === launch.id);
        if (!subject) {
            main.innerHTML = `<p class="empty-state">Subject not found. Return to patient list.</p>`;
            return;
        }
        const ap = subject.active_problems || [];
        const reportable = ap.find(p => p.is_reportable);
        if (!reportable) {
            main.innerHTML = `<p class="empty-state">This subject has no reportable disease on the active problem list.</p>`;
            return;
        }
        const disease = D.reportable_diseases.diseases.find(d => d.disease_id === reportable.disease_id);
        const destinations = _resolveDestinations(disease, subject, launch.kind);
        const agencies = (D.providers.agencies || []);

        const subjectName = launch.kind === "animal"
            ? `${subject.name} (${subject.species})`
            : `${subject.name.given[0]} ${subject.name.family}`;

        main.innerHTML = `
            <div class="report-summary">
                <h2>📋 File reportable disease report</h2>

                <div class="rs-block">
                    <strong>Subject</strong>
                    <span>${_esc(subjectName)}</span>
                </div>
                <div class="rs-block">
                    <strong>Disease</strong>
                    <span>${_esc(disease.common_name)} · ICD-10 ${_esc(disease.icd10)} · SCT ${_esc(disease.snomed_ct)}</span>
                </div>
                <div class="rs-block">
                    <strong>Reporter</strong>
                    <span>${_esc(reporter.name)} · ${_esc(reporter.facility_name)}</span>
                </div>
            </div>

            ${_renderRiskWidget(subject, launch.kind, disease, destinations)}

            <div class="destinations">
                <h3>Routed to ${destinations.length} destination${destinations.length === 1 ? '' : 's'}</h3>
                <p class="dest-blurb">NotifiAZ identified the right destinations from the disease, the patient's residence, and (for animals) the zoonotic status. Click any destination to preview the message that will be sent.</p>
                <div class="dest-grid">
                    ${destinations.map(did => {
                        const a = agencies.find(x => x.id === did);
                        return `
                            <div class="destination-card" data-dest="${_esc(did)}">
                                <div class="dest-card-head">
                                    <strong>${_esc(a ? a.short_name : did)}</strong>
                                    <small>${_esc(a ? a.message_format : '')}</small>
                                </div>
                                <small class="dest-card-name">${_esc(a ? a.name : did)}</small>
                                <small class="dest-card-spec">${_esc(a ? a.spec_version : '')}</small>
                                <button class="dest-preview-btn" data-dest="${_esc(did)}">Preview message →</button>
                                <div class="dest-preview" data-dest="${_esc(did)}" hidden></div>
                            </div>`;
                    }).join("")}
                </div>
            </div>

            <div class="report-actions">
                <button class="btn-primary" id="submit-report">⚡ Submit to all ${destinations.length} agencies</button>
                <button class="btn-secondary" id="cancel-report">Cancel</button>
            </div>
        `;

        // Wire preview buttons
        main.querySelectorAll(".dest-preview-btn").forEach(b => {
            b.addEventListener("click", (e) => {
                e.preventDefault();
                const did = b.dataset.dest;
                const previewEl = main.querySelector(`.dest-preview[data-dest="${did}"]`);
                if (!previewEl.hidden) { previewEl.hidden = true; b.textContent = "Preview message →"; return; }
                const msg = window.NA_MESSAGES.generateForDestination(subject, disease.disease_id, reporter, did, launch.kind);
                previewEl.innerHTML = `
                    <div class="preview-meta"><strong>${_esc(msg.format)}</strong> · ack-id <code>${_esc(msg.ack_id)}</code></div>
                    <pre class="preview-content">${_esc(msg.content || "(no content generated)")}</pre>
                    ${msg.validation_errors.length ? `<div class="preview-errors"><strong>⚠ Validation errors:</strong><ul>${msg.validation_errors.map(e => `<li>${_esc(e)}</li>`).join("")}</ul></div>` : `<div class="preview-ok">✓ Validates against ${_esc(msg.spec)}</div>`}
                `;
                previewEl.hidden = false;
                b.textContent = "Hide preview";
            });
        });

        document.getElementById("cancel-report").addEventListener("click", () => {
            window._NA_LAUNCH_SUBJECT = null;
            window.NA_APP.showView("ehr");
        });

        document.getElementById("submit-report").addEventListener("click", () => {
            _doSubmit(subject, disease, reporter, destinations, launch.kind);
        });
    }

    function _renderRiskWidget(subject, kind, disease, destinations) {
        if (!window.NA_SCORE) return "";
        const score = window.NA_SCORE.scoreReport(subject, kind, disease, destinations);
        if (!score) return "";
        const tier = score.decision;
        const pct = (score.probability * 100).toFixed(0);
        const factors = window.NA_SCORE.explain(score, 3);
        const tips = window.NA_SCORE.suggestImprovements(score);
        const cls = tier === "high" ? "risk-high" : tier === "moderate" ? "risk-mod" : "risk-low";
        const tag = tier === "high" ? "HIGH callback risk"
                  : tier === "moderate" ? "MODERATE callback risk"
                  : "LOW callback risk";

        return `
            <div class="risk-widget ${cls}">
                <div class="rw-head">
                    <strong>📊 Pre-submission risk check</strong>
                    <span class="risk-tag">${tag}</span>
                </div>
                <div class="rw-body">
                    <div class="rw-meter-block">
                        <div class="rw-meter-track">
                            <div class="rw-meter-fill" style="width: ${pct}%"></div>
                        </div>
                        <div class="rw-meter-label"><strong>${pct}%</strong> probability of agency callback</div>
                    </div>
                    <div class="rw-factors">
                        <small><strong>Top contributing factors:</strong></small>
                        <ul>
                            ${factors.map(f => `
                                <li>
                                    <span class="rw-arrow ${f.dir==='increases' ? 'up' : 'down'}">${f.dir==='increases'?'▲':'▼'}</span>
                                    ${_esc(f.label)}
                                    <small class="rw-mag">(${f.dir} risk by ${f.magnitude})</small>
                                </li>`).join("")}
                        </ul>
                    </div>
                    ${tips.length ? `
                        <details class="rw-tips">
                            <summary>What's missing? (${tips.length} suggestion${tips.length===1?'':'s'})</summary>
                            <ul>
                                ${tips.map(t => `<li><strong>${_esc(t.field)}:</strong> ${_esc(t.suggestion)}</li>`).join("")}
                            </ul>
                        </details>` : ''}
                </div>
                <small class="rw-foot">Logistic-regression model · F1 = ${(window.NA_PREDICTOR?.metrics?.logistic_regression?.f1 || 0).toFixed(2)} · AUC = ${(window.NA_PREDICTOR?.metrics?.logistic_regression?.auc || 0).toFixed(2)} · See Insights tab for full model card.</small>
            </div>`;
    }

    function _doSubmit(subject, disease, reporter, destinations, kind) {
        const subjectId = kind === "animal" ? subject.animal_id : subject.patient_id;
        const deliveries = destinations.map(did => {
            const msg = window.NA_MESSAGES.generateForDestination(subject, disease.disease_id, reporter, did, kind);
            return {
                destination_id: did,
                ack_id: msg.ack_id,
                submitted_at: new Date().toISOString(),
                state: "submitted",
                message_format: msg.format,
                message_content: msg.content,
                validation_errors: msg.validation_errors,
            };
        });
        const report = {
            report_id: `R-${(Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase()}`,
            reporter_id: reporter.id,
            subject_id: subjectId,
            subject_kind: kind,
            disease_id: disease.disease_id,
            submitted_at: new Date().toISOString(),
            deliveries,
        };
        window.NA_STORE.addReport(report);

        // Show success state
        const main = document.getElementById("reporter-main");
        main.innerHTML = `
            <div class="report-success">
                <div class="success-icon">✓</div>
                <h2>Report submitted</h2>
                <p>Sent to ${deliveries.length} destination${deliveries.length === 1 ? "" : "s"}. Acknowledgement IDs:</p>
                <ul class="ack-list">
                    ${deliveries.map(d => {
                        const a = ((window.NA_DATA||{}).providers||{}).agencies?.find(x => x.id === d.destination_id);
                        return `<li><strong>${_esc(a ? a.short_name : d.destination_id)}</strong> <code>${_esc(d.ack_id)}</code></li>`;
                    }).join("")}
                </ul>
                <div class="report-actions">
                    <button class="btn-primary" id="back-to-ehr">← Back to patient list</button>
                </div>
            </div>`;
        document.getElementById("back-to-ehr").addEventListener("click", () => {
            window._NA_LAUNCH_SUBJECT = null;
            window.NA_APP.showView("ehr");
        });
        _renderSidePanel();
    }

    function _renderStandalonePicker(main) {
        const session = window.NA_STORE.getSession();
        const D = window.NA_DATA || {};
        const isVet = session.role === "veterinarian";
        const subjects = isVet
            ? (D.animals || []).filter(a => a.facility_id === session.facility_id && a.active_problems[0]?.is_reportable)
            : (D.patients || []).filter(p => p.active_problems[0]?.is_reportable);

        main.innerHTML = `
            <h2>📋 Pick a reportable case to file</h2>
            <p class="dest-blurb">Or open a chart in the EHR and use the launch button there. The launch button is the production path; this picker exists so you can demo the standalone mode.</p>
            <div class="standalone-list">
                ${subjects.slice(0, 25).map(s => {
                    const id = isVet ? s.animal_id : s.patient_id;
                    const name = isVet ? s.name : `${s.name.given[0]} ${s.name.family}`;
                    const dx = s.active_problems[0];
                    return `
                        <button class="standalone-tile" data-id="${_esc(id)}" data-kind="${isVet ? 'animal' : 'human'}">
                            <strong>${_esc(name)}</strong>
                            <small>${_esc(dx.name)}</small>
                        </button>`;
                }).join("")}
            </div>`;
        main.querySelectorAll(".standalone-tile").forEach(t => {
            t.addEventListener("click", () => {
                window._NA_LAUNCH_SUBJECT = { id: t.dataset.id, kind: t.dataset.kind };
                _renderForm();
            });
        });
    }

    function _renderSidePanel() {
        const session = window.NA_STORE.getSession();
        const side = document.getElementById("reporter-side");
        const reports = window.NA_STORE.listReports({ reporterId: session.user_id });
        const agencies = ((window.NA_DATA||{}).providers||{}).agencies || [];
        const D = window.NA_DATA || {};

        if (reports.length === 0) {
            side.innerHTML = `
                <h3>My filed reports</h3>
                <p class="empty-state">You haven't filed any reports yet. Open a patient with a reportable disease in the EHR and click <strong>📋 File reportable disease report</strong> to begin.</p>`;
            return;
        }

        side.innerHTML = `
            <h3>My filed reports <small>(${reports.length})</small></h3>
            <div class="my-reports">
                ${reports.map(r => {
                    const subjectName = r.subject_kind === "animal"
                        ? (D.animals.find(a => a.animal_id === r.subject_id)?.name || r.subject_id)
                        : (() => {
                            const p = D.patients.find(p => p.patient_id === r.subject_id);
                            return p ? `${p.name.given[0]} ${p.name.family}` : r.subject_id;
                        })();
                    const disease = D.reportable_diseases.diseases.find(d => d.disease_id === r.disease_id);
                    const callbackPending = r.deliveries.some(d => d.state === "callback_pending");
                    const summaryState = (() => {
                        const states = r.deliveries.map(d => d.state);
                        if (states.every(s => s === "closed")) return "closed";
                        if (states.includes("callback_pending")) return "callback_pending";
                        if (states.includes("reply_received")) return "reply_received";
                        if (states.every(s => s === "received")) return "received";
                        return "submitted";
                    })();
                    return `
                        <div class="my-report-card state-${summaryState}" data-rid="${_esc(r.report_id)}">
                            <div class="mrc-head">
                                <strong>${_esc(subjectName)}</strong>
                                <span class="state-pill state-${summaryState}">${summaryState.replace(/_/g, " ")}</span>
                            </div>
                            <small class="mrc-disease">${_esc(disease ? disease.common_name : r.disease_id)}</small>
                            <small class="mrc-time">filed ${_relTime(r.submitted_at)}</small>
                            ${callbackPending ? '<div class="callback-badge">⚠ Agency callback waiting</div>' : ''}
                            <details class="mrc-details">
                                <summary>Per-agency status</summary>
                                ${r.deliveries.map(d => {
                                    const a = agencies.find(x => x.id === d.destination_id);
                                    return `
                                        <div class="dest-status">
                                            <strong>${_esc(a ? a.short_name : d.destination_id)}</strong>
                                            <span class="state-pill state-${d.state}">${d.state.replace(/_/g, " ")}</span>
                                            <small>ack: ${_esc(d.ack_id)}</small>
                                            ${d.callback?.question ? `
                                                <div class="dss-callback">
                                                    <small><strong>${_esc(d.callback.sent_by || 'investigator')} asks:</strong></small>
                                                    <p>${_esc(d.callback.question)}</p>
                                                    ${d.state === "callback_pending" ? `
                                                        <textarea class="reply-text" data-rid="${_esc(r.report_id)}" data-dest="${_esc(d.destination_id)}" placeholder="Type your reply..."></textarea>
                                                        <button class="btn-secondary reply-btn" data-rid="${_esc(r.report_id)}" data-dest="${_esc(d.destination_id)}">Send reply</button>
                                                    ` : `
                                                        <small><strong>You replied:</strong></small>
                                                        <p class="reply-text">${_esc(d.callback.reply || "")}</p>
                                                    `}
                                                </div>` : ''}
                                            ${d.closure_note ? `<div class="closure-note"><small><strong>Closed:</strong></small><p>${_esc(d.closure_note)}</p></div>` : ''}
                                        </div>`;
                                }).join("")}
                            </details>
                        </div>`;
                }).join("")}
            </div>`;

        // Wire reply buttons
        side.querySelectorAll(".reply-btn").forEach(b => {
            b.addEventListener("click", () => {
                const rid = b.dataset.rid, dest = b.dataset.dest;
                const ta = side.querySelector(`textarea.reply-text[data-rid="${rid}"][data-dest="${dest}"]`);
                const text = (ta.value || "").trim();
                if (!text) { alert("Please enter a reply."); return; }
                window.NA_STORE.sendReply(rid, dest, session.user_id, text);
                _renderSidePanel();
            });
        });
    }

    function _relTime(iso) {
        const dt = new Date(iso); const now = new Date();
        const min = Math.round((now - dt) / 60000);
        if (min < 1) return "just now";
        if (min < 60) return `${min}m ago`;
        if (min < 1440) return `${Math.round(min / 60)}h ago`;
        return `${Math.round(min / 1440)}d ago`;
    }

    window.NA_REPORTER = { render };
})();
