// 🔔 NOTIFICATION SYSTEM FOR RM TAILORED
(function(){
    const supabaseUrl = 'https://jahrvqdxbdcnqnxuhewf.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaHJ2cWR4YmRjbnFueHVoZXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDY4ODUsImV4cCI6MjA3ODI4Mjg4NX0._Q8_o41iN2_roejx67FvOQ8DlMApPdw0L3bmWhymgNc';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Create notification container if it doesn't exist
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    /**
     * 📢 SHOW TOAST NOTIFICATION
     */
    window.showNotification = function(title, message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.style.cssText = `
            background: white;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid ${getNotificationColor(type)};
            animation: slideIn 0.3s ease;
            max-width: 350px;
        `;

        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong style="color: #333;">${title}</strong>
                    <div style="color: #666; font-size: 14px; margin-top: 5px;">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; color: #999;">
                    ×
                </button>
            </div>
        `;

        document.getElementById('notificationContainer').appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    };

    function getNotificationColor(type) {
        const colors = {
            'info': '#17a2b8',
            'success': '#28a745',
            'warning': '#ffc107',
            'error': '#dc3545',
            'overdue': '#dc143c',
            'assignment': '#1E3A8A'
        };
        return colors[type] || colors.info;
    }

    /**
     * 🔍 GET UNREAD NOTIFICATION COUNT
     */
    window.getUnreadNotificationCount = async function(userId) {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting notification count:', error);
            return 0;
        }
    };

    /**
     * 📨 CREATE NEW NOTIFICATION
     */
    window.createNotification = async function(userId, type, title, message, relatedId = null) {
        try {
            const { error } = await supabase
                .from('notifications')
                .insert([{
                    user_id: userId,
                    type: type,
                    title: title,
                    message: message,
                    related_id: relatedId
                }]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error creating notification:', error);
            return false;
        }
    };

    /**
     * 📋 GET USER NOTIFICATIONS
     */
    window.getUserNotifications = async function(userId, limit = 10) {
        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return notifications || [];
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    };

    /**
     * ✅ MARK NOTIFICATION AS READ
     */
    window.markNotificationAsRead = async function(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    };

    /**
     * 🔔 CHECK FOR OVERDUE ORDERS (Run on dashboard load)
     */
    window.checkOrderNotifications = async function(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Check overdue orders
            const { data: overdueOrders, error: overdueError } = await supabase
                .from('orders')
                .select('id, customer_name, due_date')
                .lt('due_date', today)
                .neq('status', 'completed')
                .neq('status', 'delivered');

            if (!overdueError && overdueOrders && overdueOrders.length > 0) {
                overdueOrders.forEach(async order => {
                    // Check if notification already exists
                    const { data: existing } = await supabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('type', 'overdue')
                        .eq('related_id', order.id)
                        .eq('is_read', false)
                        .single();

                    if (!existing) {
                        await createNotification(
                            userId,
                            'overdue',
                            '🚨 Overdue Order',
                            `Order for ${order.customer_name} is overdue (Due: ${new Date(order.due_date).toLocaleDateString()})`,
                            order.id
                        );
                    }
                });
            }

            // Check orders due in 2 days
            const twoDaysLater = new Date();
            twoDaysLater.setDate(twoDaysLater.getDate() + 2);
            const twoDaysString = twoDaysLater.toISOString().split('T')[0];

            const { data: dueSoonOrders, error: dueSoonError } = await supabase
                .from('orders')
                .select('id, customer_name, due_date')
                .eq('due_date', twoDaysString)
                .neq('status', 'completed')
                .neq('status', 'delivered');

            if (!dueSoonError && dueSoonOrders && dueSoonOrders.length > 0) {
                dueSoonOrders.forEach(async order => {
                    const { data: existing } = await supabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('type', 'due_soon')
                        .eq('related_id', order.id)
                        .eq('is_read', false)
                        .single();

                    if (!existing) {
                        await createNotification(
                            userId,
                            'due_soon',
                            '📅 Order Due Soon',
                            `Order for ${order.customer_name} is due in 2 days`,
                            order.id
                        );
                    }
                });
            }

        } catch (error) {
            console.error('Error checking order notifications:', error);
        }
    };

    /**
     * 🔔 CHECK FOR WORKER-SPECIFIC NOTIFICATIONS
     */
    window.checkWorkerNotifications = async function(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Only check orders assigned to this worker
            const { data: myOrders, error } = await supabase
                .from('orders')
                .select('id, customer_name, due_date, status')
                .eq('assigned_to', userId)
                .neq('status', 'completed')
                .neq('status', 'delivered');

            if (error) throw error;

            if (myOrders && myOrders.length > 0) {
                myOrders.forEach(async order => {
                    // Overdue notifications for worker's own orders
                    if (order.due_date < today) {
                        const { data: existing } = await supabase
                            .from('notifications')
                            .select('id')
                            .eq('user_id', userId)
                            .eq('type', 'overdue')
                            .eq('related_id', order.id)
                            .eq('is_read', false)
                            .single();

                        if (!existing) {
                            await createNotification(
                                userId,
                                'overdue',
                                '🚨 Your Order Overdue',
                                `Your assigned order for ${order.customer_name} is overdue`,
                                order.id
                            );
                        }
                    }

                    // Due soon notifications
                    const twoDaysLater = new Date();
                    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
                    const twoDaysString = twoDaysLater.toISOString().split('T')[0];

                    if (order.due_date === twoDaysString) {
                        const { data: existing } = await supabase
                            .from('notifications')
                            .select('id')
                            .eq('user_id', userId)
                            .eq('type', 'due_soon')
                            .eq('related_id', order.id)
                            .eq('is_read', false)
                            .single();

                        if (!existing) {
                            await createNotification(
                                userId,
                                'due_soon',
                                '📅 Your Order Due Soon',
                                `Your assigned order for ${order.customer_name} is due in 2 days`,
                                order.id
                            );
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error checking worker notifications:', error);
        }
    };

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notification-badge {
            background: #dc143c;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: -5px;
            right: -5px;
        }
    `;
    document.head.appendChild(style);

    console.log('🔔 Notification system initialized');
})();