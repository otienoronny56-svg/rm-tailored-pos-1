// 🔐 BULLETPROOF AUTHENTICATION SYSTEM FOR RM TAILORED
(function(){
    const supabaseUrl = 'https://jahrvqdxbdcnqnxuhewf.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaHJ2cWR4YmRjbnFueHVoZXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDY4ODUsImV4cCI6MjA3ODI4Mjg4NX0._Q8_o41iN2_roejx67FvOQ8DlMApPdw0L3bmWhymgNc';

    // Create Supabase client
    const supabaseClient = window.supabase && window.supabase.createClient
        ? window.supabase.createClient(supabaseUrl, supabaseKey)
        : null;

    /**
     * 🛡️ VALIDATE SESSION - Checks if user is logged in and authorized
     * @param {string|null} requiredRole - Optional: 'admin' or 'worker'
     * @returns {Promise<object>} User object if valid
     * @throws {Error} If session is invalid
     */
    window.validateSession = async function(requiredRole = null) {
        try {
            console.log('🔍 Validating session...');

            // Check if Supabase is available
            if (!supabaseClient) {
                throw new Error('Supabase client not available');
            }

            // Get session from localStorage
            const sessionData = localStorage.getItem('rmTailoredUser');
            if (!sessionData) {
                console.log('❌ No session found in localStorage');
                throw new Error('No session found');
            }

            const user = JSON.parse(sessionData);
            console.log('📋 Session data:', { email: user.email, role: user.role });

            // Validate session structure
            if (!user || !user.loggedIn || !user.id || !user.email || !user.role) {
                console.log('❌ Invalid session structure');
                throw new Error('Invalid session data');
            }

            // Verify user exists in database with matching credentials
            const { data: workers, error } = await supabaseClient
                .from('workers')
                .select('id, email, role, session_token')
                .eq('id', user.id)
                .eq('email', user.email)
                .eq('role', user.role);

            if (error) {
                console.error('❌ Database error:', error);
                throw new Error('Database verification failed');
            }

            if (!workers || workers.length === 0) {
                console.log('❌ User not found in database or credentials changed');
                throw new Error('Session invalid - user not found');
            }

            const dbWorker = workers[0];
            console.log('✅ User verified in database');

            // Verify session token if it exists
            if (user.sessionToken && dbWorker.session_token) {
                if (user.sessionToken !== dbWorker.session_token) {
                    console.log('❌ Session token mismatch');
                    throw new Error('Session token invalid');
                }
                console.log('✅ Session token verified');
            }

            // Check role authorization
            if (requiredRole && dbWorker.role !== requiredRole) {
                console.log('❌ Unauthorized role:', dbWorker.role, 'required:', requiredRole);
                throw new Error(`Unauthorized: This page requires ${requiredRole} access`);
            }

            console.log('✅ Session validated successfully');

            // Return validated user data
            return {
                id: dbWorker.id,
                email: dbWorker.email,
                role: dbWorker.role,
                loggedIn: true,
                sessionToken: user.sessionToken,
                loginTime: user.loginTime
            };

        } catch (error) {
            console.error('❌ Session validation failed:', error.message);
            
            // Clear invalid session
            localStorage.removeItem('rmTailoredUser');
            
            // Redirect to login
            alert('🔒 Session expired or invalid. Please login again.\n\nError: ' + error.message);
            window.location.href = 'index.html';
            
            throw error;
        }
    };

    /**
     * 🚪 LOGOUT - Clears session and redirects to login
     */
    window.logout = async function() {
        try {
            console.log('🚪 Logging out...');

            const sessionData = localStorage.getItem('rmTailoredUser');
            if (sessionData) {
                const user = JSON.parse(sessionData);
                
                // Clear session token in database
                if (user.id && supabaseClient) {
                    try {
                        await supabaseClient
                            .from('workers')
                            .update({ session_token: null })
                            .eq('id', user.id);
                        console.log('✅ Session token cleared from database');
                    } catch (e) {
                        console.warn('⚠️ Could not clear session token:', e.message);
                    }
                }
            }
        } finally {
            // Always clear localStorage and redirect
            localStorage.removeItem('rmTailoredUser');
            console.log('✅ Logout successful');
            window.location.href = 'index.html';
        }
    };

    /**
     * 👤 GET CURRENT USER - Returns current user without validation
     * @returns {object|null} User object or null
     */
    window.getCurrentUser = function() {
        try {
            const sessionData = localStorage.getItem('rmTailoredUser');
            if (sessionData) {
                return JSON.parse(sessionData);
            }
            return null;
        } catch (e) {
            console.error('Error getting current user:', e);
            return null;
        }
    };

    /**
     * ✅ CHECK IF LOGGED IN - Quick check without database validation
     * @returns {boolean}
     */
    window.isLoggedIn = function() {
        const user = getCurrentUser();
        return user && user.loggedIn === true;
    };

    console.log('🔐 Auth system initialized');
})();