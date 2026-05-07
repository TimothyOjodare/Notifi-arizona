/* ============================================================================
 * NotifiAZ — shared/store.js
 *
 * Single source of truth for reports. Backed by localStorage to simulate a
 * shared backend. All three surfaces (EHR, reporter, investigator) read from
 * and write to this store.
 *
 * State machine for each delivery (one report can have multiple deliveries,
 * one per agency destination):
 *
 *   submitted ─→ received ─┬─→ callback_pending ─→ reply_received ─→ closed
 *                          └─→ closed (no callback needed)
 *
 * Each report:
 *   {
 *     report_id: "R-...",
 *     reporter_id: "dr-reyes",
 *     subject_id: "P-...",
 *     subject_kind: "human" | "animal",
 *     disease_id: "valley_fever",
 *     submitted_at: ISO timestamp,
 *     deliveries: [
 *       {
 *         destination_id: "adhs",
 *         ack_id: "ACK-...",
 *         submitted_at: ISO,
 *         state: "submitted" | "received" | "callback_pending" | "reply_received" | "closed",
 *         received_at: ISO,
 *         received_by: "agency_intake_system" | investigator_id,
 *         callback: { question, sent_by, sent_at, reply, replied_by, replied_at },
 *         closed_at: ISO,
 *         closed_by: investigator_id,
 *         closure_note: string,
 *         message_format: "HL7_v2_5_1_ELR" | etc,
 *         message_content: string (the actual generated message),
 *       }
 *     ]
 *   }
 * ========================================================================== */

(function () {
    'use strict';

    const STORAGE_KEY = "notifiaz.reports.v1";
    const SESSION_KEY = "notifiaz.session.v1";
    const AUDIT_KEY   = "notifiaz.audit.v1";

    // ----- low-level storage -----
    function _load() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch (e) { return []; }
    }
    function _save(reports) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    }

    function _seedIfEmpty() {
        const existing = _load();
        if (existing.length > 0) return;
        const seed = (window.NA_DATA && window.NA_DATA.seed_reports) || [];
        _save(seed);
    }

    // ----- public API -----

    function listReports(filter) {
        _seedIfEmpty();
        const all = _load();
        if (!filter) return all;
        return all.filter(r => {
            if (filter.reporterId && r.reporter_id !== filter.reporterId) return false;
            if (filter.destinationId && !r.deliveries.some(d => d.destination_id === filter.destinationId)) return false;
            if (filter.state && !r.deliveries.some(d => d.state === filter.state)) return false;
            if (filter.subjectKind && r.subject_kind !== filter.subjectKind) return false;
            if (filter.diseaseId && r.disease_id !== filter.diseaseId) return false;
            return true;
        });
    }

    function getReport(reportId) {
        return _load().find(r => r.report_id === reportId);
    }

    function addReport(report) {
        const all = _load();
        all.unshift(report);   // newest first
        _save(all);
        audit("report_submitted", { report_id: report.report_id, disease_id: report.disease_id, n_destinations: report.deliveries.length });
        return report;
    }

    function _updateDelivery(reportId, destinationId, updater) {
        const all = _load();
        const r = all.find(r => r.report_id === reportId);
        if (!r) return null;
        const d = r.deliveries.find(x => x.destination_id === destinationId);
        if (!d) return null;
        updater(d);
        _save(all);
        return r;
    }

    function markReceived(reportId, destinationId, investigatorId) {
        return _updateDelivery(reportId, destinationId, d => {
            d.state = "received";
            d.received_at = new Date().toISOString();
            d.received_by = investigatorId;
            audit("report_received", { report_id: reportId, destination_id: destinationId, investigator_id: investigatorId });
        });
    }

    function sendCallback(reportId, destinationId, investigatorId, question) {
        return _updateDelivery(reportId, destinationId, d => {
            d.state = "callback_pending";
            d.callback = d.callback || {};
            d.callback.question = question;
            d.callback.sent_by = investigatorId;
            d.callback.sent_at = new Date().toISOString();
            audit("callback_sent", { report_id: reportId, destination_id: destinationId, investigator_id: investigatorId });
        });
    }

    function sendReply(reportId, destinationId, clinicianId, replyText) {
        return _updateDelivery(reportId, destinationId, d => {
            d.state = "reply_received";
            d.callback = d.callback || {};
            d.callback.reply = replyText;
            d.callback.replied_by = clinicianId;
            d.callback.replied_at = new Date().toISOString();
            audit("callback_replied", { report_id: reportId, destination_id: destinationId, clinician_id: clinicianId });
        });
    }

    function closeDelivery(reportId, destinationId, investigatorId, closureNote) {
        return _updateDelivery(reportId, destinationId, d => {
            d.state = "closed";
            d.closed_at = new Date().toISOString();
            d.closed_by = investigatorId;
            d.closure_note = closureNote || "";
            audit("delivery_closed", { report_id: reportId, destination_id: destinationId, investigator_id: investigatorId });
        });
    }

    // ----- session -----

    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
        catch (e) { return null; }
    }
    function setSession(session) {
        if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        else localStorage.removeItem(SESSION_KEY);
    }

    // ----- audit log -----

    function audit(event, detail) {
        let log = [];
        try { log = JSON.parse(localStorage.getItem(AUDIT_KEY)) || []; } catch {}
        const session = getSession();
        log.unshift({
            ts: new Date().toISOString(),
            event,
            actor: session ? `${session.role}:${session.user_id}` : "anonymous",
            detail,
        });
        if (log.length > 500) log.length = 500;
        localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
    }
    function getAuditLog() {
        try { return JSON.parse(localStorage.getItem(AUDIT_KEY)) || []; }
        catch (e) { return []; }
    }

    // ----- reset (for demo replay) -----

    function resetAll() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(AUDIT_KEY);
        _seedIfEmpty();
    }

    window.NA_STORE = {
        listReports, getReport, addReport,
        markReceived, sendCallback, sendReply, closeDelivery,
        getSession, setSession,
        audit, getAuditLog,
        resetAll,
    };
})();
