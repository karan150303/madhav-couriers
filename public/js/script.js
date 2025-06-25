// Shipping Rate Calculator for Madhav Couriers and Logistics
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const calculateBtn = document.getElementById('calculateBtn');
    const bookShipmentBtn = document.getElementById('bookShipmentBtn');
    const resultSection = document.getElementById('resultSection');
    const form = document.getElementById('rateCalculator');
    
    // Rate configuration based on pincode ranges
    const rateConfig = {
        '110001-169999': {
            surface: 35,
            express: 100,
            heavy: 23
        },
        '170001-199999': {
            surface: 45,
            express: 120,
            heavy: 28
        },
        '200001-299999': {
            surface: 40,
            express: 110,
            heavy: 24
        },
        '300001-499999': {
            surface: 55,
            express: 125,
            heavy: 28
        },
        '500001-699999': {
            surface: 58,
            express: 130,
            heavy: 32
        },
        '700001-899999': {
            surface: 70,
            express: 140,
            heavy: 33
        }
    };
    
    // ODA pincodes (example - you should replace with your actual ODA list)
    const odaPincodes = [
        // Add your ODA pincodes here
        // Example:
        // '173212', '193301', '262580'
    ];
    
    // Get rate based on pincode and service type
    function getRate(pincode, serviceType) {
        const pin = parseInt(pincode);
        
        for (const range in rateConfig) {
            const [min, max] = range.split('-').map(Number);
            if (pin >= min && pin <= max) {
                return rateConfig[range][serviceType];
            }
        }
        
        // Default rate if pincode doesn't match any range
        return 50;
    }
    
    // Check if pincode is ODA
    function isODA(pincode) {
        return odaPincodes.includes(pincode.toString());
    }
    
    // Calculate volumetric weight
    function calculateVolumetricWeight(length, width, height) {
        if (length && width && height) {
            return (length * width * height) / 5000;
        }
        return 0;
    }
    
    // Calculate shipping cost
    function calculateShippingCost() {
        // Get form values
        const originPincode = document.getElementById('originPincode').value.trim();
        const destinationPincode = document.getElementById('destinationPincode').value.trim();
        const transportMode = document.getElementById('transportMode').value;
        const weight = parseFloat(document.getElementById('weight').value) || 0;
        const length = parseFloat(document.getElementById('length').value) || 0;
        const width = parseFloat(document.getElementById('width').value) || 0;
        const height = parseFloat(document.getElementById('height').value) || 0;
        const codAmount = parseFloat(document.getElementById('codAmount').value) || 0;
        const declaredValue = parseFloat(document.getElementById('declaredValue').value) || 0;
        const pickupRequired = document.getElementById('pickupRequired').checked;
        
        // Validate inputs
        if (!originPincode || !destinationPincode || !transportMode || weight <= 0) {
            alert('Please fill in all required fields with valid values');
            return;
        }
        
        // Determine service type based on transport mode and weight
        let serviceType;
        if (transportMode === 'heavy' || (transportMode === 'surface' && weight > 20)) {
            serviceType = 'heavy';
        } else {
            serviceType = transportMode;
        }
        
        // Get base rate
        const baseRate = getRate(destinationPincode, serviceType);
        
        // Calculate volumetric weight
        const volumetricWeight = calculateVolumetricWeight(length, width, height);
        const chargeableWeight = Math.max(weight, volumetricWeight);
        
        // Calculate base cost
        let baseCost = baseRate * chargeableWeight;
        
        // Calculate additional charges
        const codCharges = codAmount > 0 ? codAmount * 0.01 : 0; // 1% COD charges
        const insuranceCharges = declaredValue > 0 ? declaredValue * 0.005 : 0; // 0.5% insurance
        const pickupCharges = pickupRequired ? 200 : 0;
        
        // Check for ODA charges
        let odaCharges = 0;
        if (isODA(destinationPincode)) {
            if (chargeableWeight < 100) {
                odaCharges = 700;
            } else if (chargeableWeight >= 200 && chargeableWeight <= 400) {
                odaCharges = 1000;
            }
            // For weights between 100-200kg or above 400kg, no special ODA charges in this example
        }
        
        // Calculate total cost
        const totalCost = baseCost + codCharges + insuranceCharges + pickupCharges + odaCharges;
        
        // Display results
        document.getElementById('baseCost').textContent = `₹${baseCost.toFixed(2)}`;
        document.getElementById('volumetricWeight').textContent = `${volumetricWeight.toFixed(2)} kg`;
        document.getElementById('codCharges').textContent = `₹${codCharges.toFixed(2)}`;
        document.getElementById('insuranceCharges').textContent = `₹${insuranceCharges.toFixed(2)}`;
        document.getElementById('pickupCharges').textContent = `₹${pickupCharges.toFixed(2)}`;
        document.getElementById('odaCharges').textContent = `₹${odaCharges.toFixed(2)}`;
        document.getElementById('totalCost').textContent = `₹${totalCost.toFixed(2)}`;
        
        // Show result section
        resultSection.style.display = 'block';
        
        // Set up WhatsApp booking button
        bookShipmentBtn.onclick = function() {
            const message = `Hi Madhav Couriers,\n\nI would like to book a shipment:\n\n` +
                           `- From: ${originPincode}\n` +
                           `- To: ${destinationPincode}\n` +
                           `- Weight: ${weight} kg\n` +
                           `- Volumetric Weight: ${volumetricWeight.toFixed(2)} kg\n` +
                           `- Transport Mode: ${transportMode}\n` +
                           `- COD Amount: ₹${codAmount}\n` +
                           `- Declared Value: ₹${declaredValue}\n` +
                           `- Total Estimated Cost: ₹${totalCost.toFixed(2)}\n\n` +
                           `Please confirm availability and proceed with booking.`;
            
            const whatsappUrl = `https://wa.me/919814178706?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        };
    }
    
    // Event listeners
    calculateBtn.addEventListener('click', calculateShippingCost);
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateShippingCost();
    });
});
