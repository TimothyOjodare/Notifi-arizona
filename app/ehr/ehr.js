/* ============================================================================
 * NotifiAZ — ehr/ehr.js
 *
 * Mock Epic-like EHR. Shows the signed-in clinician/vet's patient list and
 * an Epic-shaped chart. The reportable-disease cases display a prominent
 * "📋 File reportable disease report →" launch button that takes the user
 * to the reporter with the patient + encounter pre-loaded.
 *
 * For physicians: shows humans (filtered by facility).
 * For veterinarians: shows animals (filtered by facility).
 * ========================================================================== */

(function () {
    'use strict';

    function _esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g,
            c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    }

    function _hashIdx(str, mod) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h * 31) ^ str.charCodeAt(i)) >>> 0;
        return h % mod;
    }

    function _patientsForClinician(clinicianFacilityId) {
        const D = window.NA_DATA || {};
        const all = D.patients || [];
        // Hash-distribute the 60 patients across the 6 hospitals
        const facilities = ["tmc", "banner-phx", "banner-mesa", "honor", "ihs-whiteriver", "naz"];
        const idx = facilities.indexOf(clinicianFacilityId);
        return all.filter(p => _hashIdx(p.patient_id, facilities.length) === idx);
    }

    function _animalsForVet(vetFacilityId) {
        const D = window.NA_DATA || {};
        return (D.animals || []).filter(a => a.facility_id === vetFacilityId);
    }

    function render() {
        const session = window.NA_STORE.getSession();
        if (!session) return;
        const isVet = session.role === "veterinarian";
        const subjects = isVet ? _animalsForVet(session.facility_id)
                                : _patientsForClinician(session.facility_id);

        const list = document.getElementById("ehr-list");
        list.innerHTML = `
            <div class="ehr-list-head">
                <strong>${isVet ? "Animal patients" : "Patients"}</strong>
                <small>${subjects.length} ${isVet ? "animals" : "patients"} · ${session.facility}</small>
            </div>
            ${subjects.length === 0 ? '<p class="empty-state">No patients on this clinician\'s panel.</p>' :
                subjects.map(s => {
                    const id = isVet ? s.animal_id : s.patient_id;
                    const name = isVet ? s.name : `${s.name.given[0]} ${s.name.family}`;
                    const sub = isVet ? `${s.species} · ${s.owner.name}`
                                       : `${s.sex}, ${s.age}y · ${s.address.city}`;
                    const reportable = (s.active_problems || []).some(p => p.is_reportable);
                    const visit = isVet ? s.encounter_date : (s.encounters[0]?.date);
                    return `
                        <div class="ehr-li-item ${reportable ? 'reportable' : ''}" data-id="${_esc(id)}" data-kind="${isVet ? 'animal' : 'human'}">
                            <strong class="ehr-li-name">${_esc(name)}</strong>
                            ${reportable ? '<span class="ehr-flag">📋</span>' : ''}
                            <small class="ehr-li-sub">${_esc(sub)}</small>
                            <small class="ehr-li-visit">${_esc(visit || "")}</small>
                        </div>`;
                }).join("")}`;

        list.querySelectorAll(".ehr-li-item").forEach(item => {
            item.addEventListener("click", () => {
                list.querySelectorAll(".ehr-li-item").forEach(x => x.classList.remove("selected"));
                item.classList.add("selected");
                _renderChart(item.dataset.id, item.dataset.kind);
            });
        });

        // Auto-select first reportable if any
        const firstReportable = list.querySelector(".ehr-li-item.reportable");
        if (firstReportable) firstReportable.click();
    }

    function _renderChart(subjectId, kind) {
        const D = window.NA_DATA || {};
        const subject = kind === "animal"
            ? D.animals.find(a => a.animal_id === subjectId)
            : D.patients.find(p => p.patient_id === subjectId);
        if (!subject) return;
        const chart = document.getElementById("ehr-chart");
        const isAnimal = kind === "animal";
        const headerName = isAnimal ? subject.name : `${subject.name.given[0]} ${subject.name.family}`;
        const meta = isAnimal
            ? `${subject.species} · owner ${subject.owner.name} · ${subject.facility_name}`
            : `${subject.sex}, ${subject.age}y · DOB ${subject.birthDate} · MRN ${subject.patient_id}`;
        const enc = isAnimal ? subject : subject.encounters[0];
        const ap = subject.active_problems || [];
        const reportable = ap.find(p => p.is_reportable);

        chart.innerHTML = `
            <div class="chart-head">
                <h2>${_esc(headerName)}</h2>
                <p class="chart-meta">${_esc(meta)}</p>
            </div>

            ${reportable ? `
                <div class="reportable-banner ${reportable.is_zoonotic ? 'zoonotic' : ''}">
                    <div class="rb-l">
                        <strong>${reportable.is_zoonotic ? '⚠️ Zoonotic — reportable' : '📋 Reportable disease'}</strong>
                        <span class="rb-name">${_esc(reportable.name)}</span>
                        <small>ICD-10 ${_esc(reportable.icd10)} · SCT ${_esc(reportable.snomed)}</small>
                        ${reportable.is_zoonotic ? '<span class="cross-pill">↔ ADHS bridge</span>' : ''}
                    </div>
                    <button class="rb-launch" data-subject="${_esc(subjectId)}" data-kind="${kind}">
                        📋 File reportable disease report →
                    </button>
                </div>
            ` : ''}

            <section class="chart-section">
                <h3>Most recent encounter</h3>
                <div class="chart-row"><strong>Date:</strong> ${_esc(isAnimal ? subject.encounter_date : enc.date)}</div>
                <div class="chart-row"><strong>Facility:</strong> ${_esc(enc.facility_name || subject.facility_name)}</div>
                <div class="chart-row"><strong>Chief complaint:</strong> ${_esc(enc.chief_complaint)}</div>
                <div class="chart-row"><strong>HPI:</strong></div>
                <p class="chart-narrative">${_esc(enc.hpi)}</p>
                <div class="chart-row"><strong>Exam:</strong> Temp ${enc.exam.temp_f}°F · HR ${enc.exam.hr} · RR ${enc.exam.rr} ${enc.exam.spo2 ? '· SpO₂ ' + enc.exam.spo2 + '%' : ''} ${enc.exam.bp ? '· BP ' + enc.exam.bp : ''}</div>
                <div class="chart-row"><strong>Assessment:</strong> ${_esc(enc.assessment)}</div>
                <div class="chart-row"><strong>Plan:</strong></div>
                <p class="chart-narrative">${_esc(enc.plan)}</p>
            </section>

            ${ap.length ? `
                <section class="chart-section">
                    <h3>Active problems</h3>
                    <ul class="problem-list">
                        ${ap.map(p => `<li>
                            <strong>${_esc(p.name)}</strong>
                            <small>ICD-10 ${_esc(p.icd10)} · SCT ${_esc(p.snomed)}</small>
                            ${p.is_reportable ? '<span class="verif-pill">REPORTABLE</span>' : ''}
                        </li>`).join("")}
                    </ul>
                </section>` : ''}

            ${(subject.lab_results || []).length ? `
                <section class="chart-section">
                    <h3>Lab results</h3>
                    <table class="lab-table">
                        <tr><th>Test</th><th>LOINC</th><th>Result</th></tr>
                        ${(subject.lab_results || []).map(l => `
                            <tr class="${l.abnormal ? 'abn' : ''}">
                                <td>${_esc(l.name)}</td>
                                <td><code>${_esc(l.loinc || '—')}</code></td>
                                <td>${_esc(l.value)}</td>
                            </tr>
                        `).join("")}
                    </table>
                </section>` : ''}
        `;

        // Wire the launch button
        const launchBtn = chart.querySelector(".rb-launch");
        if (launchBtn) {
            launchBtn.addEventListener("click", () => {
                window._NA_LAUNCH_SUBJECT = { id: subjectId, kind };
                window.NA_APP.showView("reporter");
            });
        }
    }

    window.NA_EHR = { render };
})();
