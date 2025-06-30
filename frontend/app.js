// Configuration
const API_BASE_URL = 'http://localhost:3000';
const HTTP2_BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3000';

// State variables
let httpTestResults = [];
let http2TestResults = [];
let wsTestResults = [];
let httpTestInProgress = false;
let http2TestInProgress = false;
let wsTestInProgress = false;
let webSocket = null;
let httpTestStartTime = 0;
let http2TestStartTime = 0;
let wsTestStartTime = 0;
let httpTotalTestTime = 0;
let http2TotalTestTime = 0;
let wsTotalTestTime = 0;
let durationChart = null;
let distributionChart = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // Button event listeners
    document.getElementById('start-http-test').addEventListener('click', startHttpTest);
    document.getElementById('start-http2-test').addEventListener('click', startHttp2Test);
    document.getElementById('start-ws-test').addEventListener('click', startWebSocketTest);
    document.getElementById('start-all-tests').addEventListener('click', startBothTests);
    document.getElementById('reset-metrics').addEventListener('click', resetMetrics);

    // Initialize charts
    initializeCharts();

    // Fetch initial comparison data
    fetchComparisonData();
});

// Initialize Charts
function initializeCharts() {
    const durationCtx = document.getElementById('duration-comparison-chart').getContext('2d');
    durationChart = new Chart(durationCtx, {
        type: 'bar',
        data: {
            labels: ['HTTP', 'HTTP/2', 'WebSocket'],
            datasets: [{
                label: 'Average Request Duration (ms)',
                data: [0, 0, 0],
                backgroundColor: ['rgba(52, 152, 219, 0.6)', 'rgba(155, 89, 182, 0.6)', 'rgba(46, 204, 113, 0.6)'],
                borderColor: ['rgba(52, 152, 219, 1)', 'rgba(155, 89, 182, 1)', 'rgba(46, 204, 113, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Duration (ms)'
                    }
                }
            }
        }
    });

    const distCtx = document.getElementById('request-distribution-chart').getContext('2d');
    distributionChart = new Chart(distCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'HTTP Requests',
                    data: [],
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'HTTP/2 Requests',
                    data: [],
                    borderColor: 'rgba(155, 89, 182, 1)',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'WebSocket Requests',
                    data: [],
                    borderColor: 'rgba(46, 204, 113, 1)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Duration (ms)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Request #'
                    }
                }
            }
        }
    });
}

// Generate random payload of given size
function generateRandomPayload(size) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < size; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

// Update status message
function updateStatus(message) {
    document.getElementById('status-message').textContent = message;
}

// Update progress bar
function updateProgressBar(type, percent) {
    const progressBar = document.getElementById(`${type}-progress-bar`);
    const progressText = document.getElementById(`${type}-progress-text`);

    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
}

// HTTP Test
async function startHttpTest() {
    if (httpTestInProgress || http2TestInProgress || wsTestInProgress) {
        alert('A test is already in progress. Please wait.');
        return;
    }

    // Reset HTTP test results
    httpTestResults = [];
    httpTestInProgress = true;
    httpTestStartTime = performance.now();

    // Get test parameters
    const numRequests = parseInt(document.getElementById('num-requests').value);
    const payloadSize = parseInt(document.getElementById('payload-size').value);
    const concurrentRequests = parseInt(document.getElementById('concurrent-requests').value);

    // Clear previous results
    document.getElementById('http-details-table').querySelector('tbody').innerHTML = '';
    updateProgressBar('http', 0);

    updateStatus(`Starting HTTP test with ${numRequests} requests, ${payloadSize} bytes payload, ${concurrentRequests} concurrent requests`);

    // Track completed requests
    let completedRequests = 0;

    // Function to send a single HTTP request
    async function sendHttpRequest(index) {
        try {
            const startTime = performance.now();
            const payload = { data: generateRandomPayload(payloadSize) };

            const response = await fetch(`${API_BASE_URL}/api/echo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            await response.json();

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Record result
            const result = {
                index: index,
                timestamp: new Date().toISOString(),
                duration: duration,
                payloadSize: payloadSize
            };

            httpTestResults.push(result);

            // Update table
            const tbody = document.getElementById('http-details-table').querySelector('tbody');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${result.timestamp}</td>
                <td>${result.duration.toFixed(2)}</td>
                <td>${result.payloadSize}</td>
            `;
            tbody.appendChild(row);

            // Update progress
            completedRequests++;
            const progressPercent = (completedRequests / numRequests) * 100;
            updateProgressBar('http', progressPercent);

            if (completedRequests === numRequests) {
                const totalTime = performance.now() - httpTestStartTime;
                httpTestInProgress = false;
                httpTotalTestTime = totalTime;

                updateStatus(`HTTP test completed in ${totalTime.toFixed(2)} ms`);

                // Update summary and charts
                updateHttpSummary();
                updateComparisonSummary();
                updateCharts();
            }
        } catch (error) {
            console.error('HTTP request error:', error);
            completedRequests++;
            const progressPercent = (completedRequests / numRequests) * 100;
            updateProgressBar('http', progressPercent);
        }
    }

    // Process requests in batches based on concurrency
    for (let i = 0; i < numRequests; i += concurrentRequests) {
        const batch = [];
        for (let j = 0; j < concurrentRequests && i + j < numRequests; j++) {
            batch.push(sendHttpRequest(i + j));
        }
        await Promise.all(batch);
    }
}

// HTTP/2 Test
async function startHttp2Test() {
    if (httpTestInProgress || http2TestInProgress || wsTestInProgress) {
        alert('A test is already in progress. Please wait.');
        return;
    }

    // Reset HTTP/2 test results
    http2TestResults = [];
    http2TestInProgress = true;
    http2TestStartTime = performance.now();

    // Get test parameters
    const numRequests = parseInt(document.getElementById('num-requests').value);
    const payloadSize = parseInt(document.getElementById('payload-size').value);
    const concurrentRequests = parseInt(document.getElementById('concurrent-requests').value);

    // Clear previous results
    document.getElementById('http2-details-table').querySelector('tbody').innerHTML = '';
    updateProgressBar('http2', 0);

    updateStatus(`Starting HTTP/2 test with ${numRequests} requests, ${payloadSize} bytes payload, ${concurrentRequests} concurrent requests`);

    // Track completed requests
    let completedRequests = 0;

    // Function to send a single HTTP/2 request
    async function sendHttp2Request(index) {
        try {
            const startTime = performance.now();
            const payload = { data: generateRandomPayload(payloadSize) };

            const response = await fetch(`${HTTP2_BASE_URL}/api/echo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            await response.json();

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Record result
            const result = {
                index: index,
                timestamp: new Date().toISOString(),
                duration: duration,
                payloadSize: payloadSize
            };

            http2TestResults.push(result);

            // Update table
            const tbody = document.getElementById('http2-details-table').querySelector('tbody');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${result.timestamp}</td>
                <td>${result.duration.toFixed(2)}</td>
                <td>${result.payloadSize}</td>
            `;
            tbody.appendChild(row);

            // Update progress
            completedRequests++;
            const progressPercent = (completedRequests / numRequests) * 100;
            updateProgressBar('http2', progressPercent);

            if (completedRequests === numRequests) {
                const totalTime = performance.now() - http2TestStartTime;
                http2TestInProgress = false;
                http2TotalTestTime = totalTime;

                updateStatus(`HTTP/2 test completed in ${totalTime.toFixed(2)} ms`);

                // Update summary and charts
                updateHttp2Summary();
                updateComparisonSummary();
                updateCharts();
            }
        } catch (error) {
            console.error('HTTP/2 request error:', error);
            completedRequests++;
            const progressPercent = (completedRequests / numRequests) * 100;
            updateProgressBar('http2', progressPercent);
        }
    }

    // Process requests in batches based on concurrency
    for (let i = 0; i < numRequests; i += concurrentRequests) {
        const batch = [];
        for (let j = 0; j < concurrentRequests && i + j < numRequests; j++) {
            batch.push(sendHttp2Request(i + j));
        }
        await Promise.all(batch);
    }
}

// WebSocket Test
async function startWebSocketTest() {
    if (httpTestInProgress || http2TestInProgress || wsTestInProgress) {
        alert('A test is already in progress. Please wait.');
        return;
    }

    // Reset WebSocket test results
    wsTestResults = [];
    wsTestInProgress = true;
    wsTestStartTime = performance.now();

    // Get test parameters
    const numRequests = parseInt(document.getElementById('num-requests').value);
    const payloadSize = parseInt(document.getElementById('payload-size').value);
    const concurrentRequests = parseInt(document.getElementById('concurrent-requests').value);

    // Clear previous results
    document.getElementById('ws-details-table').querySelector('tbody').innerHTML = '';
    updateProgressBar('ws', 0);

    updateStatus(`Starting WebSocket test with ${numRequests} requests, ${payloadSize} bytes payload`);

    // Connect to WebSocket server
    return new Promise((resolve) => {
        webSocket = new WebSocket(WS_URL);

        // Track completed requests and timestamps
        let completedRequests = 0;
        const requestTimestamps = {};

        webSocket.onopen = async () => {
            updateStatus('WebSocket connected, starting test...');

            // Set up message handler
            webSocket.onmessage = (event) => {
                const data = event.data;
                const endTime = performance.now();

                // Make sure data is treated as a string
                const dataStr = data.toString();

                // Try to find the matching request timestamp
                const index = parseInt(dataStr.substring(0, dataStr.indexOf(':')));
                const startTime = requestTimestamps[index];

                if (startTime) {
                    const duration = endTime - startTime;

                    // Record result
                    const result = {
                        index: index,
                        timestamp: new Date().toISOString(),
                        duration: duration,
                        payloadSize: payloadSize
                    };

                    wsTestResults.push(result);

                    // Update table
                    const tbody = document.getElementById('ws-details-table').querySelector('tbody');
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${result.timestamp}</td>
                        <td>${result.duration.toFixed(2)}</td>
                        <td>${result.payloadSize}</td>
                    `;
                    tbody.appendChild(row);

                    // Update progress
                    completedRequests++;
                    const progressPercent = (completedRequests / numRequests) * 100;
                    updateProgressBar('ws', progressPercent);

                    // Delete the timestamp as we've used it
                    delete requestTimestamps[index];

                    if (completedRequests === numRequests) {
                        const totalTime = performance.now() - wsTestStartTime;
                        wsTestInProgress = false;
                        wsTotalTestTime = totalTime;

                        updateStatus(`WebSocket test completed in ${totalTime.toFixed(2)} ms`);

                        // Close WebSocket
                        webSocket.close();

                        // Update summary and charts
                        updateWsSummary();
                        updateCharts();
                        updateComparisonSummary();
                        resolve();
                    }
                }
            };

            // Process requests in batches based on concurrency
            for (let i = 0; i < numRequests; i += concurrentRequests) {
                const batchSize = Math.min(concurrentRequests, numRequests - i);

                for (let j = 0; j < batchSize; j++) {
                    const payload = generateRandomPayload(payloadSize);
                    const index = i + j;
                    const prefixedPayload = `${index}:${payload}`;
                    requestTimestamps[index] = performance.now();
                    webSocket.send(prefixedPayload);
                }

                // Small delay between batches to avoid overwhelming the WebSocket
                if (i + batchSize < numRequests) {
                    await new Promise(r => setTimeout(r, 10));
                }
            }
        };

        webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            wsTestInProgress = false;
            updateStatus('WebSocket test failed');
            resolve();
        };

        webSocket.onclose = () => {
            if (wsTestInProgress) {
                wsTestInProgress = false;
                updateStatus('WebSocket connection closed unexpectedly');
                resolve();
            }
        };
    });
}

// Run both tests sequentially
async function startBothTests() {
    // Switch to Summary tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="summary"]').classList.add('active');
    document.getElementById('summary').classList.add('active');

    updateStatus('Running HTTP test first, then WebSocket test...');

    // Run HTTP test
    await startHttpTest();

    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));

    // Run WebSocket test
    await startWebSocketTest();

    // Update comparison summary
    updateComparisonSummary();

    updateStatus('Benchmark completed! View results in the tabs above.');
}

// Update HTTP Summary
function updateHttpSummary() {
    if (httpTestResults.length === 0) return;

    const durations = httpTestResults.map(r => r.duration);
    const avgDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    document.getElementById('http-total-requests').textContent = httpTestResults.length;
    document.getElementById('http-total-test-complete').textContent = `${httpTotalTestTime.toFixed(2)} ms`;
    document.getElementById('http-avg-duration').textContent = `${avgDuration.toFixed(2)} ms`;
    document.getElementById('http-min-duration').textContent = `${minDuration.toFixed(2)} ms`;
    document.getElementById('http-max-duration').textContent = `${maxDuration.toFixed(2)} ms`;
}

// Update HTTP/2 Summary
function updateHttp2Summary() {
    if (http2TestResults.length === 0) return;

    const durations = http2TestResults.map(r => r.duration);
    const avgDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    document.getElementById('http2-total-requests').textContent = http2TestResults.length;
    document.getElementById('http2-total-test-complete').textContent = `${http2TotalTestTime.toFixed(2)} ms`;
    document.getElementById('http2-avg-duration').textContent = `${avgDuration.toFixed(2)} ms`;
    document.getElementById('http2-min-duration').textContent = `${minDuration.toFixed(2)} ms`;
    document.getElementById('http2-max-duration').textContent = `${maxDuration.toFixed(2)} ms`;
}

// Update WebSocket Summary
function updateWsSummary() {
    if (wsTestResults.length === 0) return;

    const durations = wsTestResults.map(r => r.duration);
    const avgDuration = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    document.getElementById('ws-total-requests').textContent = wsTestResults.length;
    document.getElementById('ws-total-test-complete').textContent = `${wsTotalTestTime.toFixed(2)} ms`;
    document.getElementById('ws-avg-duration').textContent = `${avgDuration.toFixed(2)} ms`;
    document.getElementById('ws-min-duration').textContent = `${minDuration.toFixed(2)} ms`;
    document.getElementById('ws-max-duration').textContent = `${maxDuration.toFixed(2)} ms`;
}

// Update Comparison Summary
function updateComparisonSummary() {
    // We need at least one test result to update the table
    const hasHttpResults = httpTestResults.length > 0;
    const hasHttp2Results = http2TestResults.length > 0;
    const hasWsResults = wsTestResults.length > 0;

    if (!hasHttpResults && !hasHttp2Results && !hasWsResults) return;

    // Determine the winner based on total duration
    let winner = '-';
    let bestTotalDuration = Infinity;

    if (hasHttpResults && httpTotalTestTime < bestTotalDuration) {
        bestTotalDuration = httpTotalTestTime;
        winner = 'HTTP';
    }

    if (hasHttp2Results && http2TotalTestTime < bestTotalDuration) {
        bestTotalDuration = http2TotalTestTime;
        winner = 'HTTP/2';
    }

    if (hasWsResults && wsTotalTestTime < bestTotalDuration) {
        bestTotalDuration = wsTotalTestTime;
        winner = 'WebSocket';
    }

    // Highlight the winner card and show badge
    highlightWinner(winner);
}

// Function to highlight winner card and show badge
function highlightWinner(winner) {
    // Reset all cards first
    document.getElementById('http-card').classList.remove('winner');
    document.getElementById('http2-card').classList.remove('winner');
    document.getElementById('ws-card').classList.remove('winner');

    document.getElementById('http-winner-badge').style.display = 'none';
    document.getElementById('http2-winner-badge').style.display = 'none';
    document.getElementById('ws-winner-badge').style.display = 'none';

    // Apply winner styling to the appropriate card
    if (winner === 'HTTP') {
        document.getElementById('http-card').classList.add('winner');
        document.getElementById('http-winner-badge').style.display = 'block';
    } else if (winner === 'HTTP/2') {
        document.getElementById('http2-card').classList.add('winner');
        document.getElementById('http2-winner-badge').style.display = 'block';
    } else if (winner === 'WebSocket') {
        document.getElementById('ws-card').classList.add('winner');
        document.getElementById('ws-winner-badge').style.display = 'block';
    }
}

// Update Charts
function updateCharts() {
    // Update Duration Comparison Chart
    if (httpTestResults.length > 0 && wsTestResults.length > 0) {
        const httpAvgDuration = httpTestResults.reduce((sum, r) => sum + r.duration, 0) / httpTestResults.length;
        const wsAvgDuration = wsTestResults.reduce((sum, r) => sum + r.duration, 0) / wsTestResults.length;

        durationChart.data.datasets[0].data = [httpAvgDuration, wsAvgDuration];
        durationChart.update();
    }

    // Update Request Distribution Chart
    if (httpTestResults.length > 0 || wsTestResults.length > 0) {
        const maxLength = Math.max(httpTestResults.length, wsTestResults.length);
        const labels = Array.from({ length: maxLength }, (_, i) => i + 1);

        const httpData = httpTestResults.map(r => r.duration);
        const wsData = wsTestResults.map(r => r.duration);

        distributionChart.data.labels = labels;
        distributionChart.data.datasets[0].data = httpData;
        distributionChart.data.datasets[1].data = wsData;
        distributionChart.update();
    }
}

// Fetch comparison data from the server
async function fetchComparisonData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comparison`);
        const data = await response.json();

        // Update HTTP metrics if available
        if (data.http && data.http.metrics.length > 0) {
            httpTestResults = data.http.metrics.map((m, i) => ({
                index: i,
                timestamp: m.timestamp,
                duration: m.duration,
                payloadSize: m.payload
            }));

            // Update HTTP table
            const tbody = document.getElementById('http-details-table').querySelector('tbody');
            tbody.innerHTML = '';

            httpTestResults.forEach((result, i) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${i + 1}</td>
                    <td>${result.timestamp}</td>
                    <td>${result.duration.toFixed(2)}</td>
                    <td>${result.payloadSize}</td>
                `;
                tbody.appendChild(row);
            });

            updateHttpSummary();
        }

        // Update HTTP/2 metrics if available
        if (data.http2 && data.http2.metrics.length > 0) {
            http2TestResults = data.http2.metrics.map((m, i) => ({
                index: i,
                timestamp: m.timestamp,
                duration: m.duration,
                payloadSize: m.payload
            }));

            // Update HTTP/2 table
            const tbody = document.getElementById('http2-details-table').querySelector('tbody');
            tbody.innerHTML = '';

            http2TestResults.forEach((result, i) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${i + 1}</td>
                    <td>${result.timestamp}</td>
                    <td>${result.duration.toFixed(2)}</td>
                    <td>${result.payloadSize}</td>
                `;
                tbody.appendChild(row);
            });

            updateHttp2Summary();
        }

        // Update WebSocket metrics if available
        if (data.websocket && data.websocket.metrics.length > 0) {
            wsTestResults = data.websocket.metrics.map((m, i) => ({
                index: i,
                timestamp: m.timestamp,
                duration: m.duration,
                payloadSize: m.payload
            }));

            // Update WS table
            const tbody = document.getElementById('ws-details-table').querySelector('tbody');
            tbody.innerHTML = '';

            wsTestResults.forEach((result, i) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${i + 1}</td>
                    <td>${result.timestamp}</td>
                    <td>${result.duration.toFixed(2)}</td>
                    <td>${result.payloadSize}</td>
                `;
                tbody.appendChild(row);
            });

            updateWsSummary();
        }

        // Update comparison if both have data
        if (data.http.metrics.length > 0 && data.websocket.metrics.length > 0) {
            updateComparisonSummary();
        }

        // Update charts
        updateCharts();

    } catch (error) {
        console.error('Error fetching comparison data:', error);
    }
}

// Reset metrics
async function resetMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reset`, {
            method: 'POST'
        });

        await response.json();

        // Clear local results
        httpTestResults = [];
        http2TestResults = [];
        wsTestResults = [];
        httpTotalTestTime = 0;
        http2TotalTestTime = 0;
        wsTotalTestTime = 0;

        // Update UI
        document.getElementById('http-details-table').querySelector('tbody').innerHTML = '';
        document.getElementById('http2-details-table').querySelector('tbody').innerHTML = '';
        document.getElementById('ws-details-table').querySelector('tbody').innerHTML = '';

        document.getElementById('http-total-requests').textContent = '0';
        document.getElementById('http-total-test-complete').textContent = '0 ms';
        document.getElementById('http-avg-duration').textContent = '0 ms';
        document.getElementById('http-min-duration').textContent = '0 ms';
        document.getElementById('http-max-duration').textContent = '0 ms';

        document.getElementById('http2-total-requests').textContent = '0';
        document.getElementById('http2-total-test-complete').textContent = '0 ms';
        document.getElementById('http2-avg-duration').textContent = '0 ms';
        document.getElementById('http2-min-duration').textContent = '0 ms';
        document.getElementById('http2-max-duration').textContent = '0 ms';

        document.getElementById('ws-total-requests').textContent = '0';
        document.getElementById('ws-total-test-complete').textContent = '0 ms';
        document.getElementById('ws-avg-duration').textContent = '0 ms';
        document.getElementById('ws-min-duration').textContent = '0 ms';
        document.getElementById('ws-max-duration').textContent = '0 ms';

        document.getElementById('performance-diff').textContent = '-';
        document.getElementById('faster-protocol').textContent = '-';
        document.getElementById('speed-improvement').textContent = '-';

        // Reset progress bars
        updateProgressBar('http', 0);
        updateProgressBar('http2', 0);
        updateProgressBar('ws', 0);

        // Reset charts
        durationChart.data.datasets[0].data = [0, 0, 0];
        durationChart.update();

        distributionChart.data.labels = [];
        distributionChart.data.datasets[0].data = [];
        distributionChart.data.datasets[1].data = [];
        distributionChart.data.datasets[2].data = [];
        distributionChart.update();

        updateStatus('Metrics reset successfully');
    } catch (error) {
        console.error('Error resetting metrics:', error);
        updateStatus('Failed to reset metrics');
    }
}
