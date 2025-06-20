// Tracking functionality
document.getElementById('trackForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const trackResult = document.getElementById('trackResult');
    const trackingNumber = this.querySelector('input').value.trim().toUpperCase();
    
    // Check if tracking number starts with MCL and has 12 characters
    if (!trackingNumber.startsWith('MCL') || trackingNumber.length !== 12) {
        trackResult.innerHTML = `
            <div style="color: #ef4444; background: #fee2e2; padding: 15px; border-radius: 6px;">
                <strong>Invalid tracking number format.</strong> Please enter a valid MCL tracking number (e.g. MCL123456789).
            </div>
        `;
        trackResult.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch(`/api/track/${trackingNumber}`);
        const shipment = await response.json();
        
        if (response.ok) {
            // Format status with appropriate color
            let statusClass = '';
            let statusText = shipment.status;
            
            switch(shipment.status) {
                case 'Booked':
                    statusClass = 'status-booked';
                    break;
                case 'In Transit':
                    statusClass = 'status-transit';
                    break;
                case 'Out for Delivery':
                    statusClass = 'status-out';
                    break;
                case 'Delivered':
                    statusClass = 'status-delivered';
                    break;
            }
            
            trackResult.innerHTML = `
                <h4>Tracking Results for: ${trackingNumber}</h4>
                <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Status:</strong></span>
                        <span class="status-badge ${statusClass}" style="font-weight: 600;">${statusText}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Customer:</strong></span>
                        <span>${shipment.customerName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Origin:</strong></span>
                        <span>${shipment.origin}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Destination:</strong></span>
                        <span>${shipment.destination}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Current Location:</strong></span>
                        <span>${shipment.currentCity}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span><strong>Last Update:</strong></span>
                        <span>${new Date(shipment.lastUpdated).toLocaleString()}</span>
                    </div>
                    ${shipment.shipmentDetails ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0;">
                        <strong>Shipment Details:</strong>
                        <p>${shipment.shipmentDetails}</p>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            trackResult.innerHTML = `
                <div style="color: #ef4444; background: #fee2e2; padding: 15px; border-radius: 6px;">
                    <strong>No shipment found with tracking number:</strong> ${trackingNumber}
                </div>
            `;
        }
    } catch (error) {
        console.error('Tracking error:', error);
        trackResult.innerHTML = `
            <div style="color: #ef4444; background: #fee2e2; padding: 15px; border-radius: 6px;">
                <strong>Error:</strong> Could not retrieve tracking information. Please try again later.
            </div>
        `;
    }
    
    trackResult.style.display = 'block';
});
// Update the tracking form submission in tracking.js
document.getElementById('trackForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const trackResult = document.getElementById('trackResult');
    const trackingNumber = this.querySelector('input').value.trim().toUpperCase();
    
    // Validation remains the same
    
    try {
        const response = await fetch(`/api/track/${trackingNumber}`);
        const data = await response.json();
        
        if (response.ok) {
            // Format the response data for display
            const shipment = data;
            // Rest of your display logic remains the same
        } else {
            // Error handling
        }
    } catch (error) {
        // Error handling
    }
});