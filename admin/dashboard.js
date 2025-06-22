document.addEventListener('DOMContentLoaded', function() {
    // 1. Authentication Verification
    const token = localStorage.getItem('adminToken');
    if (!token) {
        localStorage.removeItem('adminLoggedIn');
        window.location.href = '/admin/login.html';
        return;
    }

    // 2. Initialize Socket.IO
    const socket = io();

    // 3. DOM Elements Cache
    const elements = {
        // Dashboard Elements
        stats: {
            total: document.getElementById('totalShipments'),
            inTransit: document.getElementById('inTransit'),
            deliveredToday: document.getElementById('deliveredToday'),
            pending: document.getElementById('pendingActions')
        },
        // Modal Elements
        modals: {
            add: document.getElementById('addShipmentModal'),
            edit: document.getElementById('editShipmentModal')
        },
        // Form Elements
        forms: {
            add: document.getElementById('addShipmentForm'),
            edit: document.getElementById('editShipmentForm')
        },
        // Button Elements
        buttons: {
            add: document.getElementById('addShipmentBtn'),
            refresh: document.getElementById('refreshShipments'),
            logout: document.getElementById('logout'),
            cancel: document.getElementById('cancelShipmentBtn')
        },
        // Input Elements
        inputs: {
            search: document.getElementById('searchShipments')
        }
    };

    // 4. Utility Functions
    const utils = {
        // Status badge class mapping
        getStatusClass: (status) => {
            const statusMap = {
                'Booked': 'status-booked',
                'In Transit': 'status-transit',
                'Out for Delivery': 'status-out',
                'Delivered': 'status-delivered'
            };
            return statusMap[status] || '';
        },

        // Date formatting
        formatDate: (dateString) => {
            return new Date(dateString).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // Show alert messages
        showAlert: (message, type = 'info') => {
            const alertBox = document.createElement('div');
            alertBox.className = `alert alert-${type}`;
            alertBox.textContent = message;
            document.body.appendChild(alertBox);
            setTimeout(() => alertBox.remove(), 3000);
        },

        // API Error Handler
        handleApiError: async (response) => {
            if (response.status === 401) {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin/login.html';
                return;
            }
            
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }
    };

    // 5. Shipment Operations
    const shipmentAPI = {
        // Fetch shipments with optional search
        fetchAll: async (search = '') => {
            const url = search 
                ? `/api/shipments?search=${encodeURIComponent(search)}` 
                : '/api/shipments';
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) return utils.handleApiError(response);
            return await response.json();
        },

        // Create new shipment
        create: async (data) => {
            const response = await fetch('/api/shipments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) return utils.handleApiError(response);
            return await response.json();
        },

        // Update shipment
        update: async (trackingNumber, data) => {
            const response = await fetch(`/api/shipments/${trackingNumber}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) return utils.handleApiError(response);
            return await response.json();
        },

        // Delete shipment
        delete: async (trackingNumber) => {
            const response = await fetch(`/api/shipments/${trackingNumber}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) return utils.handleApiError(response);
            return await response.json();
        }
    };

    // 6. UI Rendering Functions
    const renderUI = {
        // Render shipments table
        shipments: async (search = '') => {
            const tableBody = document.querySelector('#shipmentsTable tbody');
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
            
            try {
                const { data: shipments } = await shipmentAPI.fetchAll(search);
                
                if (!shipments || shipments.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No shipments found</td></tr>';
                    return;
                }

                tableBody.innerHTML = shipments
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .map(shipment => `
                        <tr>
                            <td>${shipment.tracking_number}</td>
                            <td>${shipment.customer_name}</td>
                            <td><span class="status-badge ${utils.getStatusClass(shipment.status)}">${shipment.status}</span></td>
                            <td>${shipment.current_city}</td>
                            <td>${utils.formatDate(shipment.updatedAt)}</td>
                            <td>
                                <button class="action-btn btn-edit" data-id="${shipment._id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('');

                // Attach edit event listeners
                document.querySelectorAll('.btn-edit').forEach(btn => {
                    btn.addEventListener('click', () => renderUI.openEditModal(btn.dataset.id));
                });

            } catch (error) {
                utils.showAlert(error.message, 'error');
            }
        },

        // Update statistics
        stats: async () => {
            try {
                const { data: shipments } = await shipmentAPI.fetchAll();
                const today = new Date().toDateString();
                
                elements.stats.total.textContent = shipments.length;
                elements.stats.inTransit.textContent = shipments.filter(s => s.status === 'In Transit').length;
                elements.stats.deliveredToday.textContent = shipments.filter(s => 
                    s.status === 'Delivered' && new Date(s.updatedAt).toDateString() === today
                ).length;
                elements.stats.pending.textContent = shipments.filter(s => 
                    ['Booked', 'Out for Delivery'].includes(s.status)
                ).length;
            } catch (error) {
                console.error('Stats update error:', error);
            }
        },

        // Open edit modal with shipment data
        openEditModal: async (shipmentId) => {
            try {
                const response = await fetch(`/api/shipments/${shipmentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) return utils.handleApiError(response);
                
                const { data: shipment } = await response.json();
                
                document.getElementById('editTrackingNumber').value = shipment.tracking_number;
                document.getElementById('editCustomerName').textContent = shipment.customer_name;
                document.getElementById('editRoute').textContent = `${shipment.origin} to ${shipment.destination}`;
                document.getElementById('editStatus').value = shipment.status;
                document.getElementById('editCurrentCity').value = shipment.current_city;
                document.getElementById('editNotes').value = '';
                
                elements.modals.edit.style.display = 'flex';

            } catch (error) {
                utils.showAlert(error.message, 'error');
            }
        }
    };

    // 7. Event Handlers
    const setupEventHandlers = () => {
        // Modal Controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                elements.modals.add.style.display = 'none';
                elements.modals.edit.style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === elements.modals.add || e.target === elements.modals.edit) {
                elements.modals.add.style.display = 'none';
                elements.modals.edit.style.display = 'none';
            }
        });

        // Add Shipment
        if (elements.buttons.add) {
            elements.buttons.add.addEventListener('click', () => {
                elements.modals.add.style.display = 'flex';
                document.getElementById('trackingNumber').value = 'MCL' + 
                    Math.floor(100000000 + Math.random() * 900000000);
            });
        }

        // Form Submissions
        if (elements.forms.add) {
            elements.forms.add.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const shipmentData = Object.fromEntries(formData.entries());
                
                try {
                    const { data } = await shipmentAPI.create(shipmentData);
                    e.target.reset();
                    elements.modals.add.style.display = 'none';
                    utils.showAlert('Shipment created successfully!', 'success');
                    socket.emit('shipment-update', { action: 'created', shipment: data });
                } catch (error) {
                    utils.showAlert(error.message, 'error');
                }
            });
        }

        if (elements.forms.edit) {
            elements.forms.edit.addEventListener('submit', async (e) => {
                e.preventDefault();
                const trackingNumber = document.getElementById('editTrackingNumber').value;
                const updateData = {
                    status: document.getElementById('editStatus').value,
                    current_city: document.getElementById('editCurrentCity').value,
                    notes: document.getElementById('editNotes').value
                };
                
                try {
                    const { data } = await shipmentAPI.update(trackingNumber, updateData);
                    elements.modals.edit.style.display = 'none';
                    utils.showAlert('Shipment updated successfully!', 'success');
                    socket.emit('shipment-update', { action: 'updated', shipment: data });
                } catch (error) {
                    utils.showAlert(error.message, 'error');
                }
            });
        }

        // Cancel Shipment
        if (elements.buttons.cancel) {
            elements.buttons.cancel.addEventListener('click', async () => {
                const trackingNumber = document.getElementById('editTrackingNumber').value;
                if (!confirm('Are you sure you want to cancel this shipment?')) return;
                
                try {
                    const { data } = await shipmentAPI.delete(trackingNumber);
                    elements.modals.edit.style.display = 'none';
                    utils.showAlert('Shipment cancelled successfully!', 'success');
                    socket.emit('shipment-update', { action: 'cancelled', shipment: data });
                } catch (error) {
                    utils.showAlert(error.message, 'error');
                }
            });
        }

        // Search Functionality
        if (elements.inputs.search) {
            elements.inputs.search.addEventListener('input', (e) => {
                renderUI.shipments(e.target.value);
            });
        }

        // Refresh Button
        if (elements.buttons.refresh) {
            elements.buttons.refresh.addEventListener('click', () => {
                renderUI.shipments();
                renderUI.stats();
                utils.showAlert('Data refreshed', 'success');
            });
        }

        // Logout
        if (elements.buttons.logout) {
            elements.buttons.logout.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin/login.html';
                }
            });
        }
    };

    // 8. Real-time Updates
    socket.on('shipment-update', (data) => {
        if (['created', 'updated', 'cancelled'].includes(data.action)) {
            renderUI.shipments();
            renderUI.stats();
            utils.showAlert(`Shipment ${data.shipment.tracking_number} was ${data.action}`, 'info');
        }
    });

    // 9. Initialize Dashboard
    const initDashboard = async () => {
        try {
            // Verify token with backend
            const response = await fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) return utils.handleApiError(response);
            
            // Initialize UI
            setupEventHandlers();
            await renderUI.shipments();
            await renderUI.stats();
            
        } catch (error) {
            utils.showAlert(error.message, 'error');
        }
    };

    // Start the dashboard
    initDashboard();
});
