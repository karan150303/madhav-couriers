// Admin Dashboard Controller
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.IO connection
    const socket = io();
    
    // Check authentication
    const token = localStorage.getItem('adminToken');
    if (!token && !window.location.pathname.includes('login.html')) {
        window.location.href = '/admin/login.html';
        return;
    }

    // DOM Elements
    const addShipmentBtn = document.getElementById('addShipmentBtn');
    const addShipmentModal = document.getElementById('addShipmentModal');
    const editShipmentModal = document.getElementById('editShipmentModal');
    const closeModals = document.querySelectorAll('.close-modal');
    const logoutBtn = document.getElementById('logout');
    const searchInput = document.getElementById('searchShipments');
    const refreshBtn = document.getElementById('refreshShipments');

    // Modal toggle functions
    if (addShipmentBtn) {
        addShipmentBtn.addEventListener('click', () => {
            addShipmentModal.style.display = 'flex';
            // Auto-generate tracking number
            document.getElementById('trackingNumber').value = 'MCL' + 
                Math.floor(100000000 + Math.random() * 900000000);
        });
    }

    // Close modals
    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            addShipmentModal.style.display = 'none';
            editShipmentModal.style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === addShipmentModal) addShipmentModal.style.display = 'none';
        if (e.target === editShipmentModal) editShipmentModal.style.display = 'none';
    });

    // Utility functions
    function getStatusClass(status) {
        const statusMap = {
            'Booked': 'status-booked',
            'In Transit': 'status-transit',
            'Out for Delivery': 'status-out',
            'Delivered': 'status-delivered',
            'Cancelled': 'status-cancelled'
        };
        return statusMap[status] || '';
    }

    function formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    // Real-time update handler
    socket.on('tracking-update', (data) => {
        if (data.action === 'updated' || data.action === 'created') {
            renderShipments();
            updateStats();
            showAlert(`Shipment ${data.shipment.tracking_number} was ${data.action}`, 'success');
        }
    });

    // Shipment operations
    async function loadShipments(searchTerm = '') {
        try {
            const url = searchTerm 
                ? `/api/shipments?search=${encodeURIComponent(searchTerm)}`
                : '/api/shipments';
                
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin/login.html';
                }
                throw new Error('Failed to fetch shipments');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error loading shipments:', error);
            showAlert('Error loading shipments. Please try again.', 'error');
            return [];
        }
    }

    async function renderShipments(searchTerm = '') {
        const tableBody = document.querySelector('#shipmentsTable tbody');
        if (!tableBody) return;

        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading shipments...</td></tr>';
        
        const { data: shipments } = await loadShipments(searchTerm);

        if (!shipments || shipments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No shipments found</td></tr>';
            return;
        }

        // Sort by last updated (newest first)
        shipments.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        // Clear and rebuild table
        tableBody.innerHTML = '';
        
        shipments.forEach(shipment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${shipment.tracking_number}</td>
                <td>${shipment.customer_name}</td>
                <td><span class="status-badge ${getStatusClass(shipment.status)}">${shipment.status}</span></td>
                <td>${shipment.current_city}</td>
                <td>${formatDate(shipment.updatedAt)}</td>
                <td>
                    <button class="action-btn btn-view" data-id="${shipment._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" data-id="${shipment._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
    }

    async function openEditModal(shipmentId) {
        try {
            const response = await fetch(`/api/shipments/${shipmentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const { data: shipment } = await response.json();
            
            if (response.ok) {
                document.getElementById('editTrackingNumber').value = shipment.tracking_number;
                document.getElementById('editCustomerName').textContent = shipment.customer_name;
                document.getElementById('editRoute').textContent = `${shipment.origin} to ${shipment.destination}`;
                document.getElementById('editStatus').value = shipment.status;
                document.getElementById('editCurrentCity').value = shipment.current_city;
                document.getElementById('editNotes').value = '';
                
                editShipmentModal.style.display = 'flex';
            } else {
                throw new Error(shipment.message || 'Failed to load shipment');
            }
        } catch (error) {
            console.error('Error opening edit modal:', error);
            showAlert(error.message || 'Failed to load shipment details', 'error');
        }
    }

    // Stats functions
    async function updateStats() {
        try {
            const { data: shipments } = await loadShipments();
            const today = new Date().toDateString();
            
            document.getElementById('totalShipments').textContent = shipments.length;
            document.getElementById('inTransit').textContent = shipments.filter(s => s.status === 'In Transit').length;
            document.getElementById('deliveredToday').textContent = shipments.filter(s => 
                s.status === 'Delivered' && new Date(s.updatedAt).toDateString() === today
            ).length;
            document.getElementById('pendingActions').textContent = shipments.filter(s => 
                ['Booked', 'Out for Delivery'].includes(s.status)
            ).length;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    // Form handlers
    document.getElementById('addShipmentForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newShipment = {
            tracking_number: document.getElementById('trackingNumber').value,
            customer_name: document.getElementById('customerName').value,
            customer_phone: document.getElementById('customerPhone').value,
            origin: document.getElementById('origin').value,
            destination: document.getElementById('destination').value,
            status: document.getElementById('status').value,
            current_city: document.getElementById('currentCity').value,
            shipment_details: document.getElementById('shipmentDetails').value,
            weight: document.getElementById('weight').value
        };
        
        try {
            const response = await fetch('/api/shipments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newShipment)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.reset();
                addShipmentModal.style.display = 'none';
                showAlert('Shipment added successfully!', 'success');
                
                // Emit socket event
                socket.emit('new-shipment', data.data);
            } else {
                throw new Error(data.message || 'Failed to add shipment');
            }
        } catch (error) {
            console.error('Error adding shipment:', error);
            showAlert(error.message || 'Failed to add shipment', 'error');
        }
    });

    document.getElementById('editShipmentForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const trackingNumber = document.getElementById('editTrackingNumber').value;
        const updateData = {
            status: document.getElementById('editStatus').value,
            current_city: document.getElementById('editCurrentCity').value,
            notes: document.getElementById('editNotes').value
        };
        
        try {
            const response = await fetch(`/api/shipments/${trackingNumber}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                editShipmentModal.style.display = 'none';
                showAlert('Shipment updated successfully!', 'success');
                
                // Emit socket event
                socket.emit('update-shipment', {
                    action: 'updated',
                    shipment: data.data
                });
            } else {
                throw new Error(data.message || 'Failed to update shipment');
            }
        } catch (error) {
            console.error('Error updating shipment:', error);
            showAlert(error.message || 'Failed to update shipment', 'error');
        }
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            await renderShipments(e.target.value);
        }, 300));
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await renderShipments();
            await updateStats();
            showAlert('Shipments refreshed', 'success');
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin/login.html';
            }
        });
    }

    // Helper functions
    function showAlert(message, type = 'info') {
        const alertBox = document.createElement('div');
        alertBox.className = `alert alert-${type}`;
        alertBox.textContent = message;
        
        document.body.appendChild(alertBox);
        
        setTimeout(() => {
            alertBox.classList.add('fade-out');
            setTimeout(() => alertBox.remove(), 500);
        }, 3000);
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Initialize dashboard
    renderShipments();
    updateStats();
});
