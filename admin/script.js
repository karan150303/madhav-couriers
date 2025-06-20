// Admin Login
document.getElementById('adminLoginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
       if (data.success) {
    window.location.href = '/admin/dashboard';
} else {
    alert('Invalid credentials');
}
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
});

// Dashboard functionality
if (window.location.pathname.includes('/admin/dashboard')) {
    // DOM Elements
    const addShipmentBtn = document.getElementById('addShipmentBtn');
    const addShipmentModal = document.getElementById('addShipmentModal');
    const editShipmentModal = document.getElementById('editShipmentModal');
    const closeModals = document.querySelectorAll('.close-modal');
    const logoutBtn = document.getElementById('logout');
    
    // Open Add Shipment Modal
    addShipmentBtn.addEventListener('click', () => {
        addShipmentModal.style.display = 'flex';
        
    });
    
    // Close Modals
    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            addShipmentModal.style.display = 'none';
            editShipmentModal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === addShipmentModal) {
            addShipmentModal.style.display = 'none';
        }
        if (e.target === editShipmentModal) {
            editShipmentModal.style.display = 'none';
        }
    });
    
    // Function to get status badge class
    function getStatusClass(status) {
        switch(status) {
            case 'Booked': return 'status-booked';
            case 'In Transit': return 'status-transit';
            case 'Out for Delivery': return 'status-out';
            case 'Delivered': return 'status-delivered';
            default: return '';
        }
    }
    
    // Format date to readable format
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    async function loadShipments() {
        try {
            const response = await fetch('/api/shipments');
            return await response.json();
        } catch (error) {
            console.error('Error loading shipments:', error);
            return [];
        }
    }
    
    async function renderShipments() {
        const tableBody = document.querySelector('#shipmentsTable tbody');
        tableBody.innerHTML = '';
        
        const shipments = await loadShipments();
        
        if (shipments.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" style="text-align: center;">No shipments found</td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        // Sort by last updated (newest first)
        shipments.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
        
        // Show only the 10 most recent shipments
        const recentShipments = shipments.slice(0, 10);
        
        recentShipments.forEach(shipment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${shipment.trackingNumber}</td>
                <td>${shipment.customerName}</td>
                <td><span class="status-badge ${getStatusClass(shipment.status)}">${shipment.status}</span></td>
                <td>${shipment.currentCity}</td>
                <td>${formatDate(shipment.lastUpdated)}</td>
                <td>
                    <button class="action-btn" data-id="${shipment.trackingNumber}"><i class="fas fa-eye"></i></button>
                    <button class="action-btn btn-secondary" data-id="${shipment.trackingNumber}"><i class="fas fa-edit"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to edit buttons
        document.querySelectorAll('.action-btn.btn-secondary').forEach(btn => {
            btn.addEventListener('click', async function() {
                const trackingNumber = this.getAttribute('data-id');
                const shipments = await loadShipments();
                const shipment = shipments.find(s => s.trackingNumber === trackingNumber);
                
                if (shipment) {
                    document.getElementById('editTrackingNumber').value = shipment.trackingNumber;
                    document.getElementById('editCustomerName').textContent = shipment.customerName;
                    document.getElementById('editRoute').textContent = `${shipment.origin} to ${shipment.destination}`;
                    document.getElementById('editStatus').value = shipment.status;
                    document.getElementById('editCurrentCity').value = shipment.currentCity;
                    document.getElementById('editNotes').value = '';
                    
                    editShipmentModal.style.display = 'flex';
                }
            });
        });
        
        return shipments;
    }
    
    // Update stats
    async function updateStats() {
        const shipments = await loadShipments();
        const today = new Date().toDateString();
        const totalShipments = shipments.length;
        const inTransit = shipments.filter(s => s.status === 'In Transit').length;
        const deliveredToday = shipments.filter(s => 
            s.status === 'Delivered' && 
            new Date(s.lastUpdated).toDateString() === today
        ).length;
        const pendingActions = shipments.filter(s => 
            s.status === 'Booked' || s.status === 'Out for Delivery'
        ).length;
        
        document.getElementById('totalShipments').textContent = totalShipments;
        document.getElementById('inTransit').textContent = inTransit;
        document.getElementById('deliveredToday').textContent = deliveredToday;
        document.getElementById('pendingActions').textContent = pendingActions;
    }
    
    // Initial render
    renderShipments();
    updateStats();
    
    // Add new shipment
    document.getElementById('addShipmentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newShipment = {
            trackingNumber: document.getElementById('trackingNumber').value,
            customerName: document.getElementById('customerName').value,
            customerPhone: document.getElementById('customerPhone').value,
            origin: document.getElementById('origin').value,
            destination: document.getElementById('destination').value,
            status: document.getElementById('status').value,
            currentCity: document.getElementById('currentCity').value,
            shipmentDetails: document.getElementById('shipmentDetails').value,
            weight: document.getElementById('weight').value
        };
        
        try {
            const response = await fetch('/api/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newShipment)
            });
            
            if (response.ok) {
                // Reset form and refresh table
                this.reset();
                await renderShipments();
                await updateStats();
                alert('Shipment added successfully!');
                addShipmentModal.style.display = 'none';
            } else {
                throw new Error('Failed to add shipment');
            }
        } catch (error) {
            console.error('Error adding shipment:', error);
            alert('Failed to add shipment. Please try again.');
        }
    });
    
    // Update shipment
    document.getElementById('editShipmentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const trackingNumber = document.getElementById('editTrackingNumber').value;
        const updateData = {
            status: document.getElementById('editStatus').value,
            currentCity: document.getElementById('editCurrentCity').value,
            shipmentDetails: document.getElementById('editNotes').value
        };
        
        try {
            const response = await fetch(`/api/shipments/${trackingNumber}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            if (response.ok) {
                await renderShipments();
                await updateStats();
                alert('Shipment updated successfully!');
                editShipmentModal.style.display = 'none';
            } else {
                throw new Error('Failed to update shipment');
            }
        } catch (error) {
            console.error('Error updating shipment:', error);
            alert('Failed to update shipment. Please try again.');
        }
    });
    
    // Cancel shipment
    document.getElementById('cancelShipmentBtn').addEventListener('click', async function() {
        if (confirm('Are you sure you want to cancel this shipment?')) {
            const trackingNumber = document.getElementById('editTrackingNumber').value;
            
            try {
                const response = await fetch(`/api/shipments/${trackingNumber}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    await renderShipments();
                    await updateStats();
                    alert('Shipment cancelled successfully!');
                    editShipmentModal.style.display = 'none';
                } else {
                    throw new Error('Failed to cancel shipment');
                }
            } catch (error) {
                console.error('Error cancelling shipment:', error);
                alert('Failed to cancel shipment. Please try again.');
            }
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = 'login.html';
        }
    });
}
// Remove this line from the add shipment button click handler:
// document.getElementById('trackingNumber').value = 'MCL' + Math.floor(100000000 + Math.random() * 900000000);
