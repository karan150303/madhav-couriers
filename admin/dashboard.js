document.addEventListener('DOMContentLoaded', function () {
  // 1. Initialize Socket.IO
  const socket = io();

  // 2. DOM Elements Cache
  const elements = {
    stats: {
      total: document.getElementById('totalShipments'),
      inTransit: document.getElementById('inTransit'),
      deliveredToday: document.getElementById('deliveredToday'),
      pending: document.getElementById('pendingActions')
    },
    modals: {
      add: document.getElementById('addShipmentModal'),
      edit: document.getElementById('editShipmentModal')
    },
    forms: {
      add: document.getElementById('addShipmentForm'),
      edit: document.getElementById('editShipmentForm')
    },
    buttons: {
      add: document.getElementById('addShipmentBtn'),
      refresh: document.getElementById('refreshShipments'),
      logout: document.getElementById('logout'),
      cancel: document.getElementById('cancelShipmentBtn')
    },
    inputs: {
      search: document.getElementById('searchShipments')
    }
  };

  // 3. Utility Functions
  const utils = {
    getStatusClass: (status) => ({
      'Booked': 'status-booked',
      'In Transit': 'status-transit',
      'Out for Delivery': 'status-out',
      'Delivered': 'status-delivered'
    })[status] || '',

    formatDate: (dateString) =>
      new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),

    showAlert: (message, type = 'info') => {
      const alertBox = document.createElement('div');
      alertBox.className = `alert alert-${type}`;
      alertBox.textContent = message;
      document.body.appendChild(alertBox);
      setTimeout(() => alertBox.remove(), 3000);
    },

    handleApiError: async (response) => {
      if (response.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
  };

  // 4. Shipment API
  const shipmentAPI = {
    fetchAll: async (search = '') => {
      const url = search ? `/api/shipments?search=${encodeURIComponent(search)}` : '/api/shipments';
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return utils.handleApiError(response);
      return await response.json();
    },

    create: async (data) => {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) return utils.handleApiError(response);
      return await response.json();
    },

    update: async (shipmentId, data) => {
  const response = await fetch(`/api/shipments/${shipmentId}`, {
    method: 'PATCH', 
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) return utils.handleApiError(response);
      return await response.json();
    },

    delete: async (trackingNumber) => {
      const response = await fetch(`/api/shipments/${trackingNumber}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) return utils.handleApiError(response);
      return await response.json();
    }
  };

  // 5. UI Render Functions
  const renderUI = {
    shipments: async (search = '') => {
      const tableBody = document.querySelector('#shipmentsTable tbody');
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

      try {
        const { data: shipments } = await shipmentAPI.fetchAll(search);
        if (!shipments || shipments.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No shipments found</td></tr>';
          return;
        }

        tableBody.innerHTML = shipments
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .map(shipment => `
            <tr>
              <td>${shipment.tracking_number}</td>
              <td>${shipment.customer_name}</td>
              <td><span class="status-badge ${utils.getStatusClass(shipment.status)}">${shipment.status}</span></td>
              <td>${shipment.current_city}</td>
              <td>${utils.formatDate(shipment.updatedAt)}</td>
              <td>
                <button class="action-btn btn-edit" data-id="${shipment._id}">
                  <i class="fas fa-edit"></i>
                </button>
              </td>
            </tr>
          `).join('');

        document.querySelectorAll('.btn-edit').forEach(btn => {
          btn.addEventListener('click', () => renderUI.openEditModal(btn.dataset.id));
        });

      } catch (error) {
        utils.showAlert(error.message, 'error');
      }
    },

    stats: async () => {
      try {
        const { data: shipments } = await shipmentAPI.fetchAll();
        const today = new Date().toDateString();
        elements.stats.total.textContent = shipments.length;
        elements.stats.inTransit.textContent = shipments.filter(s => s.status === 'In Transit').length;
        elements.stats.deliveredToday.textContent = shipments.filter(s => s.status === 'Delivered' && new Date(s.updatedAt).toDateString() === today).length;
        elements.stats.pending.textContent = shipments.filter(s => ['Booked', 'Out for Delivery'].includes(s.status)).length;
      } catch (error) {
        console.error('Stats update error:', error);
      }
    },

    openEditModal: async (shipmentId) => {
      try {
        const response = await fetch(`/api/shipments/${shipmentId}`, {
          credentials: 'include'
        });
        if (!response.ok) return utils.handleApiError(response);
        const { data: shipment } = await response.json();

        document.getElementById('editTrackingNumber').value = shipment.tracking_number;
        document.getElementById('editCustomerName').textContent = shipment.customer_name;
        document.getElementById('editRoute').textContent = `${shipment.origin} to ${shipment.destination}`;
        document.getElementById('editStatus').value = shipment.status;
        document.getElementById('editCurrentCity').value = shipment.current_city;
        document.getElementById('editNotes').value = '';
        elements.modals.edit.style.display = 'flex';

      } catch (error) {
        utils.showAlert(error.message, 'error');
      }
    }
  };

  // 6. Event Handlers
  const setupEventHandlers = () => {
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        elements.modals.add.style.display = 'none';
        elements.modals.edit.style.display = 'none';
      });
    });

    window.addEventListener('click', (e) => {
      if (e.target === elements.modals.add || e.target === elements.modals.edit) {
        elements.modals.add.style.display = 'none';
        elements.modals.edit.style.display = 'none';
      }
    });

    elements.buttons.add?.addEventListener('click', () => {
      elements.modals.add.style.display = 'flex';
      document.getElementById('trackingNumber').value = 'MCL' + Math.floor(100000000 + Math.random() * 900000000);
    });

    elements.forms.add?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const shipmentData = Object.fromEntries(formData.entries());

      try {
        const { data } = await shipmentAPI.create(shipmentData);
        e.target.reset();
        elements.modals.add.style.display = 'none';
        utils.showAlert('Shipment created successfully!', 'success');
        socket.emit('shipment-update', { action: 'created', shipment: data });
      } catch (error) {
        utils.showAlert(error.message, 'error');
      }
    });

    elements.forms.edit?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const trackingNumber = document.getElementById('editTrackingNumber').value;
      const updateData = {
        status: document.getElementById('editStatus').value,
        current_city: document.getElementById('editCurrentCity').value,
        notes: document.getElementById('editNotes').value
      };

      try {
        const { data } = await shipmentAPI.update(trackingNumber, updateData);
        elements.modals.edit.style.display = 'none';
        utils.showAlert('Shipment updated successfully!', 'success');
        socket.emit('shipment-update', { action: 'updated', shipment: data });
      } catch (error) {
        utils.showAlert(error.message, 'error');
      }
    });

    elements.buttons.cancel?.addEventListener('click', async () => {
      const trackingNumber = document.getElementById('editTrackingNumber').value;
      if (!confirm('Are you sure you want to cancel this shipment?')) return;

      try {
        const { data } = await shipmentAPI.delete(trackingNumber);
        elements.modals.edit.style.display = 'none';
        utils.showAlert('Shipment cancelled successfully!', 'success');
        socket.emit('shipment-update', { action: 'cancelled', shipment: data });
      } catch (error) {
        utils.showAlert(error.message, 'error');
      }
    });

    elements.inputs.search?.addEventListener('input', (e) => {
      renderUI.shipments(e.target.value);
    });

    elements.buttons.refresh?.addEventListener('click', () => {
      renderUI.shipments();
      renderUI.stats();
      utils.showAlert('Data refreshed', 'success');
    });

    elements.buttons.logout?.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/admin/login.html';
      }
    });
  };

  // 7. Socket Live Update
  socket.on('shipment-update', (data) => {
    if (['created', 'updated', 'cancelled'].includes(data.action)) {
      renderUI.shipments();
      renderUI.stats();
      utils.showAlert(`Shipment ${data.shipment.tracking_number} was ${data.action}`, 'info');
    }
  });

  // 8. Auth Verify + Initialize
  const initDashboard = async () => {
    try {
      const res = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      if (!res.ok) return utils.handleApiError(res);

      setupEventHandlers();
      await renderUI.shipments();
      await renderUI.stats();
    } catch (error) {
      utils.showAlert(error.message, 'error');
    }
  };

  initDashboard();
});
