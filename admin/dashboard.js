// ========== ADMIN DASHBOARD ==========
if (window.location.pathname.includes('/admin/dashboard')) {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin/login';
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
        });
    }

    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            addShipmentModal.style.display = 'none';
            editShipmentModal.style.display = 'none';
        });
    });

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
                    window.location.href = '/admin/login';
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
        
        const shipments = await loadShipments(searchTerm);

        if (shipments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No shipments found</td></tr>';
            return;
        }

        // Sort by last updated (newest first)
        shipments.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
        
        // Clear and rebuild table
        tableBody.innerHTML = '';
        
        shipments.forEach(shipment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${shipment.trackingNumber}</td>
                <td>${shipment.customerName}</td>
                <td>${shipment.customerPhone}</td>
                <td><span class="status-badge ${getStatusClass(shipment.status)}">${shipment.status}</span></td>
                <td>${shipment.currentCity}</td>
                <td>${formatDate(shipment.lastUpdated)}</td>
                <td class="actions">
                    <button class="action-btn btn-view" data-id="${shipment._id}"><i class="fas fa-eye"></i></button>
                    <button class="action-btn btn-edit" data-id="${shipment._id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn btn-delete" data-id="${shipment._id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteShipment(btn.dataset.id));
        });
    }

    async function openEditModal(shipmentId) {
        try {
            const response = await fetch(`/api/shipments/${shipmentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const shipment = await response.json();
            
            if (response.ok) {
                document.getElementById('editShipmentId').value = shipment._id;
                document.getElementById('editTrackingNumber').value = shipment.trackingNumber;
                document.getElementById('editCustomerName').value = shipment.customerName;
                document.getElementById('editCustomerPhone').value = shipment.customerPhone;
                document.getElementById('editOrigin').value = shipment.origin;
                document.getElementById('editDestination').value = shipment.destination;
                document.getElementById('editStatus').value = shipment.status;
                document.getElementById('editCurrentCity').value = shipment.currentCity;
                document.getElementById('editWeight').value = shipment.weight;
                document.getElementById('editShipmentDetails').value = shipment.shipmentDetails;
                
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
            const shipments = await loadShipments();
            const today = new Date().toDateString();
            
            document.getElementById('totalShipments').textContent = shipments.length;
            document.getElementById('inTransit').textContent = shipments.filter(s => s.status === 'In Transit').length;
            document.getElementById('deliveredToday').textContent = shipments.filter(s => 
                s.status === 'Delivered' && new Date(s.lastUpdated).toDateString() === today
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
        
        const formData = new FormData(this);
        const newShipment = Object.fromEntries(formData.entries());
        newShipment.lastUpdated = new Date().toISOString();
        
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
                await renderShipments();
                await updateStats();
                addShipmentModal.style.display = 'none';
                showAlert('Shipment added successfully!', 'success');
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
        
        const shipmentId = document.getElementById('editShipmentId').value;
        const formData = new FormData(this);
        const updateData = Object.fromEntries(formData.entries());
        updateData.lastUpdated = new Date().toISOString();
        
        try {
            const response = await fetch(`/api/shipments/${shipmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                await renderShipments();
                await updateStats();
                editShipmentModal.style.display = 'none';
                showAlert('Shipment updated successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to update shipment');
            }
        } catch (error) {
            console.error('Error updating shipment:', error);
            showAlert(error.message || 'Failed to update shipment', 'error');
        }
    });

    async function deleteShipment(shipmentId) {
        if (!confirm('Are you sure you want to delete this shipment?')) return;
        
        try {
            const response = await fetch(`/api/shipments/${shipmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                await renderShipments();
                await updateStats();
                showAlert('Shipment deleted successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to delete shipment');
            }
        } catch (error) {
            console.error('Error deleting shipment:', error);
            showAlert(error.message || 'Failed to delete shipment', 'error');
        }
    }

    // Search functionality
    searchInput?.addEventListener('input', debounce(async (e) => {
        await renderShipments(e.target.value);
    }, 300));

    // Refresh button
    refreshBtn?.addEventListener('click', async () => {
        await renderShipments();
        await updateStats();
        showAlert('Shipments refreshed', 'success');
    });

    // Logout
    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin/login';
        }
    });

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
}
