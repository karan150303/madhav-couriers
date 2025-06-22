document.addEventListener('DOMContentLoaded', function () {
  const socket = io();
  const trackForm = document.getElementById('trackForm');
  const trackResult = document.getElementById('trackResult');

  trackForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const trackingNumber = document.getElementById('trackingNumber').value.trim().toUpperCase();

    trackResult.innerHTML = '';
    trackResult.style.display = 'none';

    if (!/^MCL\d{9}$/.test(trackingNumber)) {
      return showError('Invalid tracking number. Use MCL followed by 9 digits.');
    }

    try {
      const response = await fetch(`/api/shipments/track/${trackingNumber}`);
      const result = await response.json();

      if (result.success && result.data) {
        displayResult(result.data);
      } else {
        showError('Shipment not found.');
      }
    } catch (err) {
      showError('Server error. Try again later.');
    }
  });

  function displayResult(shipment) {
    const updated = new Date(shipment.updatedAt || shipment.createdAt).toLocaleString();
    const statusMap = {
      'Booked': 'status-booked',
      'In Transit': 'status-transit',
      'Out for Delivery': 'status-out',
      'Delivered': 'status-delivered'
    };

    trackResult.innerHTML = `
      <div class="tracking-card">
        <div class="tracking-row"><span>Status:</span><span class="status-badge ${statusMap[shipment.status] || ''}">${shipment.status}</span></div>
        <div class="tracking-row"><span>Customer:</span><span>${shipment.customer_name}</span></div>
        <div class="tracking-row"><span>From:</span><span>${shipment.origin}</span></div>
        <div class="tracking-row"><span>To:</span><span>${shipment.destination}</span></div>
        <div class="tracking-row"><span>Current Location:</span><span>${shipment.current_city}</span></div>
        <div class="tracking-row"><span>Last Update:</span><span>${updated}</span></div>
      </div>
    `;
    trackResult.style.display = 'block';
  }

  function showError(msg) {
    trackResult.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`;
    trackResult.style.display = 'block';
  }
});
