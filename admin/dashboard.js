document.addEventListener('DOMContentLoaded', function () {
  const socket = io();
  const form = document.getElementById('addShipmentForm');
  const alertBox = document.getElementById('alertBox');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(form);
    const shipment = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipment)
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Something went wrong');

      showAlert('Shipment added successfully ✅', 'success');
      form.reset();

      socket.emit('shipment-update', { action: 'created', shipment: result.data });

    } catch (error) {
      showAlert(error.message || 'Failed to create shipment', 'error');
    }
  });

  function showAlert(message, type = 'info') {
    if (!alertBox) return;
    alertBox.innerHTML = `<div class="alert ${type}">${message}</div>`;
    setTimeout(() => (alertBox.innerHTML = ''), 4000);
  }
});
