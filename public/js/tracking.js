// Initialize socket connection to server
const socket = io();

// Track form submission
document.getElementById('trackForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const trackResult = document.getElementById('trackResult');
  const trackingNumber = this.querySelector('input').value.trim().toUpperCase();

  // Validate tracking format
  if (!trackingNumber.startsWith('MCL') || trackingNumber.length !== 12) {
    showValidationError();
    return;
  }

  // Subscribe client to this tracking number for real-time updates
  socket.emit('subscribe-to-tracking', trackingNumber);

  // Fetch from backend
  try {
    const response = await fetch(`/api/shipments/track/${trackingNumber}`);
    const result = await response.json();

    if (result.success && result.data) {
      displayShipment(result.data);
    } else {
      showNotFoundError(trackingNumber);
    }
  } catch (error) {
    console.error('Tracking error:', error);
    showServerError();
  }

  trackResult.style.display = 'block';
});

// Listen for real-time updates
socket.on('tracking-update', (data) => {
  if (data?.action === 'updated' && data.shipment) {
    displayShipment(data.shipment);
  }
});

// Display shipment tracking data
function displayShipment(shipment) {
  const statusClass = getStatusClass(shipment.status || '');
  const updatedDate = new Date(shipment.updatedAt || shipment.createdAt).toLocaleString();

  document.getElementById('trackResult').innerHTML = `
    <h4>Tracking Results for: ${shipment.trackingNumber}</h4>
<span>${shipment.customerName}</span>
<span>${shipment.currentCity}</span>
<p>${shipment.shipmentDetails}</p>
    <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 10px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span><strong>Status:</strong></span>
        <span class="status-badge ${statusClass}" style="font-weight: 600;">${shipment.status}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span><strong>Customer:</strong></span>
        <span>${shipment.customer_name}</span>
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
        <span>${shipment.current_city}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span><strong>Last Update:</strong></span>
        <span>${updatedDate}</span>
      </div>
      ${shipment.shipment_details ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0;">
          <strong>Shipment Details:</strong>
          <p>${shipment.shipment_details}</p>
        </div>` : ''}
    </div>
  `;
}

// Return badge class
function getStatusClass(status) {
  switch (status) {
    case 'Booked': return 'status-booked';
    case 'In Transit': return 'status-transit';
    case 'Out for Delivery': return 'status-out';
    case 'Delivered': return 'status-delivered';
    default: return '';
  }
}

// Show errors
function showValidationError() {
  document.getElementById('trackResult').innerHTML = `
    <div style="color: #ef4444; background: #fee2e2; padding: 15px; border-radius: 6px;">
      <strong>Invalid tracking number format.</strong> Please enter a valid MCL tracking number (e.g. MCL123456789).
    </div>
  `;
  document.getElementById('trackResult').style.display = 'block';
}

function showNotFoundError(trackingNumber) {
  document.getElementById('trackResult').innerHTML = `
    <div style="color: #ef4444; background: #fee2e2; padding: 15px; border-radius: 6px;">
      <strong>No shipment found with tracking number:</strong> ${trackingNumber}
    </div>
  `;
}

function showServerError() {
  document.getElementById('trackResult').innerHTML = `
    <div style="color: #ef4444; background: #fee2e2; padding: 15px; border-radius: 6px;">
      <strong>Error:</strong> Could not retrieve tracking information. Please try again later.
    </div>
  `;
}
