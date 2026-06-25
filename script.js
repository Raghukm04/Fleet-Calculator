document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }

    // Chart instances
    let earningsChartInstance = null;
    let costChartInstance = null;

    // UI Elements
    const visualsPanel = document.getElementById('visuals-panel');
    const toggleVisualsBtn = document.getElementById('toggle-visuals-btn');

    // Input elements
    const inputs = {
        totalEarnings: document.getElementById('total-earnings'),
        loginHours: document.getElementById('login-hours'),
        orders: document.getElementById('orders'),
        deliveryDistance: document.getElementById('delivery-distance')
    };

    // Value display elements
    const outputs = {
        eph: document.getElementById('val-eph'),
        oph: document.getElementById('val-oph'),
        cpo: document.getElementById('val-cpo'),
        fuel: document.getElementById('val-fuel'),
        neph: document.getElementById('val-neph'),
        baseCpo: document.getElementById('val-base-cpo')
    };

    // Format currency / numbers
    const formatValue = (val, isCurrency = true) => {
        if (isNaN(val) || !isFinite(val)) return '--';
        return isCurrency ? `₹${val.toFixed(2)}` : val.toFixed(2);
    };

    const calculateMetrics = () => {
        // Read values
        const earnings = parseFloat(inputs.totalEarnings.value) || 0;
        const hours = parseFloat(inputs.loginHours.value) || 0;
        const orders = parseFloat(inputs.orders.value) || 0;
        const dd = parseFloat(inputs.deliveryDistance.value) || 0;

        // Variables
        let eph = 0, oph = 0, cpo = 0, hourlyFuelCost = 0, perOrderFuelCost = 0, neph = 0, baseCpo = 0;

        // 1. Total earnings / login hours = EPH
        if (hours > 0) {
            eph = earnings / hours;
        }

        // 2. Total earnings / orders = CPO
        if (orders > 0) {
            cpo = earnings / orders;
        }

        // 3. Order / login hours = OPH
        if (hours > 0) {
            oph = orders / hours;
        }

        // 5. Fuel cost calculations
        perOrderFuelCost = 5 * dd;
        hourlyFuelCost = perOrderFuelCost * oph; // Total fuel cost per hour

        // 4. NEPH (Hourly) = EPH (Hourly) - Fuel Cost (Hourly)
        neph = eph - hourlyFuelCost;

        // 6. Base CPO (Per Order) = CPO (Per Order) - Fuel Cost (Per Order)
        baseCpo = cpo > 0 ? cpo - perOrderFuelCost : 0;

        // Update DOM
        outputs.eph.innerText = hours > 0 ? formatValue(eph) : '--';
        outputs.oph.innerText = hours > 0 ? formatValue(oph, false) : '--';
        outputs.cpo.innerText = orders > 0 ? formatValue(cpo) : '--';
        
        // If DD is present and we have hours (to get OPH), calculate fuel dependencies
        if (dd > 0 && hours > 0 && orders > 0) {
            outputs.fuel.innerText = formatValue(hourlyFuelCost);
            outputs.neph.innerText = formatValue(neph);
            outputs.baseCpo.innerText = formatValue(baseCpo);
        } else {
            // Partial fallbacks if not all data is there
            if (dd === 0) {
                outputs.fuel.innerText = '--';
                outputs.neph.innerText = '--';
                outputs.baseCpo.innerText = '--';
            }
        }
        
        // Exception: if DD is 0 but we want to show NEPH = EPH without fuel deduction
        if (hours > 0 && dd === 0) {
            outputs.neph.innerText = formatValue(eph); // NEPH = EPH - 0
        }
        if (orders > 0 && dd === 0) {
            outputs.baseCpo.innerText = formatValue(cpo); // Base CPO = CPO - 0
        }

        updateCharts(eph, neph, cpo, baseCpo, perOrderFuelCost);
    };

    const updateCharts = (eph, neph, cpo, baseCpo, perOrderFuelCost) => {
        if (!earningsChartInstance || !costChartInstance) return;

        // Update Earnings Chart (EPH vs NEPH)
        earningsChartInstance.data.datasets[0].data = [eph, neph];
        earningsChartInstance.update();

        // Update Cost Chart composition (Base CPO vs Fuel Cost per order)
        costChartInstance.data.datasets[0].data = [baseCpo, perOrderFuelCost];
        costChartInstance.update();
    };

    const initCharts = () => {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded. Please check your internet connection.');
            return;
        }
        
        try {
            const ctxEarnings = document.getElementById('earningsChart').getContext('2d');
            const ctxCost = document.getElementById('costChart').getContext('2d');

            Chart.defaults.color = '#94a3b8';
            Chart.defaults.font.family = "'Outfit', sans-serif";

            earningsChartInstance = new Chart(ctxEarnings, {
                type: 'bar',
                data: {
                    labels: ['EPH (Gross)', 'NEPH (Net)'],
                    datasets: [{
                        label: 'Earnings (₹)',
                        data: [0, 0],
                        backgroundColor: ['rgba(56, 189, 248, 0.8)', 'rgba(16, 185, 129, 0.8)'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Earnings Comparison' }
                    }
                }
            });

            costChartInstance = new Chart(ctxCost, {
                type: 'doughnut',
                data: {
                    labels: ['Base CPO', 'Fuel Cost'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['rgba(168, 85, 247, 0.8)', 'rgba(244, 63, 94, 0.8)'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '70%',
                    plugins: {
                        title: { display: true, text: 'CPO Composition' }
                    }
                }
            });
        } catch (e) {
            console.error('Error initializing charts:', e);
        }
    };

    // Initialize charts on load
    initCharts();

    // Attach listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', calculateMetrics);
    });

    // Reset functionality
    const resetBtn = document.getElementById('reset-btn');
    const mobileResetBtn = document.getElementById('mobile-reset-btn');
    
    const resetCalculator = () => {
        Object.values(inputs).forEach(input => input.value = '');
        calculateMetrics(); // Will reset outputs back to '--'
    };

    if (resetBtn) {
        resetBtn.addEventListener('click', resetCalculator);
    }
    
    if (mobileResetBtn) {
        mobileResetBtn.addEventListener('click', resetCalculator);
    }

    // Toggle Visuals Panel
    if (toggleVisualsBtn && visualsPanel) {
        toggleVisualsBtn.addEventListener('click', () => {
            if (visualsPanel.style.display === 'none') {
                visualsPanel.style.display = 'block';
                toggleVisualsBtn.classList.add('active');
            } else {
                visualsPanel.style.display = 'none';
                toggleVisualsBtn.classList.remove('active');
            }
        });
    }

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside of it on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target) && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
});
