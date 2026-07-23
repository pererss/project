// SENTCOR v4.1 — Main App Initializer with Safe Namespace & Async Profile
window.S = window.S || {};
window.S.ui = window.S.ui || {};
window.S.utils = window.S.utils || {};
window.S.auth = window.S.auth || {};

(function(S) {
    "use strict";

    let currentUser = null;
    let userProfile = null;

    /**
     * Simple HTML escaping utility.
     * @param {string} str - The string to escape.
     * @returns {string} The escaped string.
     */
    S.utils.escapeHtml = function(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    /**
     * Fetches the current user's profile data from Supabase.
     * @returns {Promise<object|null>} The profile data or null if not found.
     */
    async function fetchUserProfile() {
        const supabase = S.auth.getSupabaseClient();
        if (!supabase) {
            console.error("[Main] Supabase client is not available.");
            return null;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log("[Main] No authenticated user found.");
                return null;
            }
            currentUser = user;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            
            // Combine user and profile data into a single object
            return {
                ...user,
                ...profile
            };

        } catch (error) {
            console.error("[Main] Error fetching user profile:", error);
            return null;
        }
    }

    /**
     * Initializes the main application.
     * Fetches user data and then kicks off the rest of the app's initialization.
     */
    async function init() {
        console.log("[Main] Initializing...");

        userProfile = await fetchUserProfile();

        console.log("[Main] Initializing main application UI with profile:", userProfile);

        if (userProfile) {
            // If profile is loaded, initialize the main app components
            if (S.app && typeof S.app.init === 'function') {
                S.app.init(userProfile);
            } else {
                console.error("[Main] S.app.init() is not available.");
            }
        } else {
            // If no profile, it might mean the user is not logged in.
            // The auth module should handle redirection to the login page.
            console.log("[Main] No user profile loaded. Auth module should take over.");
            // Potentially hide loading screen and show auth screen
            if (S.ui.hideLoading) S.ui.hideLoading();
            const authScreen = document.getElementById('auth-screen');
            if (authScreen) authScreen.classList.add('visible');
        }
    }

    // --- Public API ---
    S.main = {
        init
    };

})(window.S);