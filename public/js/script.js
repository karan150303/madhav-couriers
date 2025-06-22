document.addEventListener('DOMContentLoaded', function () {
  const mobileMenuBtn = document.querySelector('.mobile-menu');
  const nav = document.querySelector('nav');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function () {
      nav.classList.toggle('show');
    });
  }

  // ======= TRACKING FUNCTIONALITY ======= //

  const socket = io();

  const trackForm = document.getElementById('trackForm'); // ✅ fixed ID
  const trackingInput = document.getElementById('trackingNumber');
  const resultDiv = document.getElementById('trackResult'); // ✅ fixed

  if (trackForm) {
    trackForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const trackingNumber = trackingInput.value.trim().toUpperCase();

      resultDiv.innerHTML = '';
      resultDiv.style.display = 'none';

      if (!/^MCL\d{9}$/.test(trackingNumber)) {
        displayError('Invalid tracking number format. Use MCL followed by 9 digits.');
        return;
      }

      socket.emit('subscribe-to-tracking', trackingNumber);

      try {
        const response = await fetch(`/api/shipments/track/${trackingNumber}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });

        const data = await response.json();

        if (data.success) {
          displayTrackingResult(data.data);
        } else {
          displayError(data.message || 'Shipment not found');
        }
      } catch (err) {
        displayError('Network error. Please try again.');
      }
    });
  }

  socket.on('tracking-update', (data) => {
    if (data.action === 'updated') {
      const currentTrackingNum = trackingInput?.value.trim().toUpperCase();
      if (currentTrackingNum === data.shipment.tracking_number) {
        displayTrackingResult(data.shipment);
        showNotification('Shipment status updated!');
      }
    }
  });

  function displayTrackingResult(shipment) {
    const updatedDate = new Date(shipment.updatedAt || shipment.createdAt).toLocaleString();
    const statusClass = getStatusClass(shipment.status);

    resultDiv.innerHTML = `
      <div class="tracking-details">
        <h3>Tracking #${shipment.tracking_number}</h3>
        <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${shipment.status}</span></p>
        <p><strong>Location:</strong> ${shipment.current_city}</p>
        <p><strong>Last Updated:</strong> ${updatedDate}</p>
      </div>
    `;
    resultDiv.style.display = 'block';
  }

  function displayError(message) {
    resultDiv.innerHTML = `<div class="error">${message}</div>`;
    resultDiv.style.display = 'block';
  }

  function showNotification(message) {
    const note = document.createElement('div');
    note.className = 'tracking-notification';
    note.innerHTML = `<i class="fas fa-sync-alt"></i> ${message}`;
    document.body.appendChild(note);
    setTimeout(() => {
      note.classList.add('fade-out');
      setTimeout(() => note.remove(), 500);
    }, 3000);
  }

  function getStatusClass(status) {
    const map = {
      'Booked': 'status-booked',
      'In Transit': 'status-transit',
      'Out for Delivery': 'status-out',
      'Delivered': 'status-delivered'
    };
    return map[status] || '';
  }
});
