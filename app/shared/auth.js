/* ============================================================================
 * NotifiAZ — shared/auth.js
 *
 * Lightweight session helpers. Wraps NA_STORE.getSession / setSession.
 * Three roles: clinician, veterinarian, investigator.
 * ========================================================================== */

(function () {
    'use strict';

    function _findProvider(providerId) {
        const D = window.NA_DATA || {};
        const ps = D.providers || {};
        return (ps.clinicians || []).find(p => p.id === providerId)
            || (ps.veterinarians || []).find(p => p.id === providerId)
            || (ps.investigators || []).find(p => p.id === providerId)
            || null;
    }

    function getProviderById(id) { return _findProvider(id); }

    function getAgencyById(agencyId) {
        const ps = (window.NA_DATA || {}).providers || {};
        return (ps.agencies || []).find(a => a.id === agencyId) || null;
    }

    function getFacilityById(facilityId) {
        const D = window.NA_DATA || {};
        const ps = D.providers || {};
        const inst = (ps.clinicians || [])
            .concat(ps.veterinarians || [])
            .find(p => p.facility_id === facilityId);
        if (!inst) return null;
        return { id: facilityId, name: inst.facility_name };
    }

    function signIn(providerId, role) {
        const p = _findProvider(providerId);
        if (!p) return null;
        const session = {
            user_id: providerId,
            role,
            name: p.name,
            facility: p.facility_name || p.agency_name || "",
            agency_id: p.agency_id || null,
            facility_id: p.facility_id || null,
            specialty: p.specialty || p.role || "",
            credential: p.credential || "",
            signed_in_at: new Date().toISOString(),
        };
        window.NA_STORE.setSession(session);
        window.NA_STORE.audit("sign_in", { user_id: providerId, role });
        return session;
    }

    function signOut() {
        const s = window.NA_STORE.getSession();
        if (s) window.NA_STORE.audit("sign_out", { user_id: s.user_id });
        window.NA_STORE.setSession(null);
    }

    function requireSession() {
        return window.NA_STORE.getSession();
    }

    window.NA_AUTH = { signIn, signOut, requireSession,
                       getProviderById, getAgencyById, getFacilityById };
})();
