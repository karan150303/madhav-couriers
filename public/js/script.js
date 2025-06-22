// Mobile menu toggle functionality
document.addEventListener('DOMContentLoaded', function () {
  const mobileMenuBtn = document.querySelector('.mobile-menu');
  const nav = document.querySelector('nav');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function () {
      nav.classList.toggle('show');
    });
  }

  // ======= TRACKING FUNCTIONALITY ======= //

  // Connect to Socket.io
  const socket = io();

  // Track shipment form submission
  const trackForm = document.getElementById('trackingForm');
  if (trackForm) {
    trackForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const trackingNumber = document.getElementById('trackingNumber').value.trim();

      try {
        const response = await fetch(`/api/shipments/track/${trackingNumber}`);
        const data = await response.json();

        if (data.success) {
          displayTrackingResult(data.data);
        } else {
          displayTrackingError(data.message || 'Shipment not found');
        }
      } catch (err) {
        displayTrackingError('Network error. Please try again.');
      }
    });
  }

  // Real-time shipment updates
  socket.on('shipment-update', (data) => {
    if (data.action === 'created' || data.action === 'updated') {
      if (window.location.pathname === '/') {
        updateTrackingDisplay(data.shipment);
      }
    }
  });

  // Display tracking result
  function displayTrackingResult(shipment) {
    const resultDiv = document.getElementById('tracking-result');
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div class="tracking-details">
          <h3>Tracking #${shipment.tracking_number}</h3>
          <p><strong>Status:</strong> <span class="status">${shipment.status}</span></p>
          <p><strong>Location:</strong> ${shipment.current_city}</p>
          <p><strong>Last Updated:</strong> ${new Date(shipment.lastUpdated).toLocaleString()}</p>
        </div>
      `;
    }
  }

  // Display error
  function displayTrackingError(message) {
    const resultDiv = document.getElementById('tracking-result');
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="error">${message}</div>`;
    }
  }

  // Update tracking UI in real time if user is viewing that shipment
  function updateTrackingDisplay(shipment) {
    const currentTrackingNum = document.getElementById('trackingNumber')?.value.trim();
    if (currentTrackingNum === shipment.tracking_number) {
      displayTrackingResult(shipment);
    }
  }
});
