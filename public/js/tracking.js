// Initialize socket connection
const socket = io();

// Track form submission
document.getElementById('trackForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const trackResult = document.getElementById('trackResult');
  const trackingNumber = this.querySelector('input').value.trim().toUpperCase();

  // Clear previous results
  trackResult.innerHTML = '';
  trackResult.style.display = 'none';

  // Validate tracking format
  if (!trackingNumber.match(/^MCL\d{9}$/)) {
    showValidationError();
    return;
  }

  // Subscribe to tracking updates
  socket.emit('subscribe-to-tracking', trackingNumber);

  try {
    // Fetch shipment data
    const response = await fetch(`/api/shipments/${trackingNumber}`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) throw new Error('Network error');
    
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
});

// Listen for real-time updates
socket.on('tracking-update', (data) => {
  if (data?.action === 'updated' && data.shipment) {
    displayShipment(data.shipment);
    showNotification("Shipment status updated!");
  }
});

// Display shipment data
function displayShipment(shipment) {
  const statusClass = getStatusClass(shipment.status);
  const updatedDate = new Date(shipment.updatedAt || shipment.createdAt).toLocaleString();

  document.getElementById('trackResult').innerHTML = `
    <div class="tracking-result">
      <h4>Tracking Results: ${shipment.tracking_number}</h4>
      <div class="tracking-card">
        <div class="tracking-row">
          <span>Status:</span>
          <span class="status-badge ${statusClass}">${shipment.status}</span>
        </div>
        <div class="tracking-row">
          <span>Customer:</span>
          <span>${shipment.customer_name}</span>
        </div>
        <div class="tracking-row">
          <span>From:</span>
          <span>${shipment.origin}</span>
        </div>
        <div class="tracking-row">
          <span>To:</span>
          <span>${shipment.destination}</span>
        </div>
        <div class="tracking-row">
          <span>Current Location:</span>
          <span>${shipment.current_city}</span>
        </div>
        <div class="tracking-row">
          <span>Last Update:</span>
          <span>${updatedDate}</span>
        </div>
        ${shipment.shipment_details ? `
        <div class="tracking-details">
          <strong>Details:</strong>
          <p>${shipment.shipment_details}</p>
        </div>` : ''}
      </div>
    </div>
  `;
  document.getElementById('trackResult').style.display = 'block';
}

// Status badge styling
function getStatusClass(status) {
  const statusMap = {
    'Booked': 'status-booked',
    'In Transit': 'status-transit',
    'Out for Delivery': 'status-out',
    'Delivered': 'status-delivered'
  };
  return statusMap[status] || '';
}

// Error handling
function showValidationError() {
  showError('Invalid tracking number format. Please use MCL followed by 9 digits (e.g. MCL123456789)');
}

function showNotFoundError(trackingNumber) {
  showError(`No shipment found with tracking number: ${trackingNumber}`);
}

function showServerError() {
  showError('Could not retrieve tracking information. Please try again later.');
}

function showError(message) {
  const trackResult = document.getElementById('trackResult');
  trackResult.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      ${message}
    </div>
  `;
  trackResult.style.display = 'block';
}

// Notification for updates
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'tracking-notification';
  notification.innerHTML = `
    <i class="fas fa-sync-alt"></i> ${message}
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}
