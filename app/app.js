/* ============================================================================
 * NotifiAZ — app.js
 *
 * Top-level router. Wires the login screen, mode tabs, and view switching.
 * ========================================================================== */

(function () {
    'use strict';

    const SESSION_VIEWS = {
        clinician:    ["ehr", "reporter", "insights"],
        veterinarian: ["ehr", "reporter", "insights"],
        investigator: ["investigator", "insights"],
    };
    const DEFAULT_VIEW = {
        clinician: "ehr",
        veterinarian: "ehr",
        investigator: "investigator",
    };

    function showView(viewName) {
        document.querySelectorAll(".view").forEach(v =>
            v.classList.toggle("active", v.id === "view-" + viewName));
        document.querySelectorAll(".mode-btn").forEach(b =>
            b.classList.toggle("active", b.dataset.view === viewName));
        if (viewName === "ehr" && window.NA_EHR) window.NA_EHR.render();
        if (viewName === "reporter" && window.NA_REPORTER) window.NA_REPORTER.render();
        if (viewName === "investigator" && window.NA_INV) window.NA_INV.render();
        if (viewName === "insights" && window.NA_INSIGHTS) window.NA_INSIGHTS.render();
    }

    function renderSessionStrip() {
        const session = window.NA_STORE.getSession();
        const sessEl = document.getElementById("na-session");
        const modesEl = document.getElementById("na-modes");
        if (!session) {
            sessEl.innerHTML = "";
            modesEl.innerHTML = "";
            showView("login");
            return;
        }
        sessEl.innerHTML = `
            <span class="role-pill role-${session.role}">${session.role.toUpperCase()}</span>
            <span class="sess-name">${session.name}</span>
            <span class="sess-fac">· ${session.facility || ""}</span>
            <button class="sess-out" id="sign-out-btn">Sign out</button>`;
        document.getElementById("sign-out-btn").addEventListener("click", () => {
            window.NA_AUTH.signOut();
            renderSessionStrip();
        });

        // Mode buttons appropriate for the role
        const allowed = SESSION_VIEWS[session.role] || [];
        const labels = { ehr: "📋 Patient list", reporter: "⚡ Reporter", investigator: "🔍 Inbox", insights: "📈 Insights" };
        modesEl.innerHTML = allowed.map(v =>
            `<button class="mode-btn" data-view="${v}">${labels[v] || v}</button>`).join("");
        modesEl.querySelectorAll(".mode-btn").forEach(b => {
            b.addEventListener("click", () => showView(b.dataset.view));
        });

        // Default landing view
        showView(DEFAULT_VIEW[session.role] || allowed[0]);
    }

    function renderIdentityGrid(role) {
        const D = window.NA_DATA || {};
        const ps = D.providers || {};
        const grid = document.getElementById("identity-grid");
        let people = [];
        if (role === "clinician") people = ps.clinicians || [];
        else if (role === "veterinarian") people = ps.veterinarians || [];
        else if (role === "investigator") people = ps.investigators || [];

        grid.innerHTML = `
            <h4 class="identity-h">Choose your demo identity</h4>
            <div class="identity-tiles">
                ${people.map(p => `
                    <button class="identity-tile" data-id="${p.id}">
                        <strong>${p.name}</strong>
                        <small class="ident-cred">${p.credential || ""}</small>
                        <small class="ident-fac">${p.facility_name || p.agency_name || ""}</small>
                        <small class="ident-spec">${p.specialty || p.role || ""}</small>
                    </button>
                `).join("")}
            </div>`;
        grid.querySelectorAll(".identity-tile").forEach(t => {
            t.addEventListener("click", () => {
                window.NA_AUTH.signIn(t.dataset.id, role);
                renderSessionStrip();
            });
        });
    }

    function renderLogin() {
        // Reset role-card highlight
        document.querySelectorAll(".role-card").forEach(c => c.classList.remove("active"));
        document.getElementById("identity-grid").innerHTML = "";
        document.querySelectorAll(".role-card").forEach(c => {
            c.addEventListener("click", () => {
                document.querySelectorAll(".role-card").forEach(x => x.classList.remove("active"));
                c.classList.add("active");
                renderIdentityGrid(c.dataset.role);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderLogin();
        renderSessionStrip();
    });

    // Expose for cross-module navigation
    window.NA_APP = { showView, renderSessionStrip };
})();
