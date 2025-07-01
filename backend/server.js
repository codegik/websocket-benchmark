const express = require('express');
const http1 = require('http');
const http2 = require('http2');
const WebSocket = require('ws');
const cors = require('cors');
const promClient = require('prom-client');
const fs = require('fs');
const path = require('path');

// Create Express app for HTTP/1.1
const http1App = express();
http1App.use(express.json());
http1App.use(cors());

// Enable HTTP/1.1 server
const http1Server = http1.createServer(http1App);

// Create HTTP/2 server with TLS
const http2Options = {
  key: fs.readFileSync(path.join(__dirname, 'certs/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
  allowHTTP1: true // Allow HTTP/1 fallback (optional)
};
const http2Server = http2.createSecureServer(http2Options);

// Create WebSocket server on HTTP/1.1
const wss = new WebSocket.Server({ server: http1Server });

// Initialize Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const http1RequestDurationHistogram = new promClient.Histogram({
  name: 'http1_request_duration_ms',
  help: 'Duration of HTTP/1.1 requests in ms',
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000],
  registers: [register]
});

const http2RequestDurationHistogram = new promClient.Histogram({
  name: 'http2_request_duration_ms',
  help: 'Duration of HTTP/2 requests in ms',
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000],
  registers: [register]
});

const wsRequestDurationHistogram = new promClient.Histogram({
  name: 'ws_request_duration_ms',
  help: 'Duration of WebSocket requests in ms',
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000],
  registers: [register]
});

// Store metrics for comparison
let http1Metrics = [];
let http2Metrics = [];
let wsMetrics = [];

// HTTP/1.1 endpoints
http1App.post('/api/echo', (req, res) => {
  const start = performance.now();

  // Echo back the request body
  const data = req.body;

  const duration = performance.now() - start;
  http1RequestDurationHistogram.observe(duration);

  // Store metrics for this request
  http1Metrics.push({
    timestamp: new Date().toISOString(),
    duration: duration,
    payload: JSON.stringify(data).length
  });

  res.json(data);
});

// Metrics endpoint only for HTTP/1.1
http1App.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Comparison endpoint only for HTTP/1.1
http1App.get('/api/comparison', (req, res) => {
  // Calculate averages and other statistics
  const http1Avg = http1Metrics.length > 0
    ? http1Metrics.reduce((sum, item) => sum + item.duration, 0) / http1Metrics.length
    : 0;

  const http2Avg = http2Metrics.length > 0
    ? http2Metrics.reduce((sum, item) => sum + item.duration, 0) / http2Metrics.length
    : 0;

  const wsAvg = wsMetrics.length > 0
    ? wsMetrics.reduce((sum, item) => sum + item.duration, 0) / wsMetrics.length
    : 0;

  // Return comparison data
  res.json({
    http: {
      totalRequests: http1Metrics.length,
      averageDuration: http1Avg,
      metrics: http1Metrics.slice(-100) // Return last 100 metrics only
    },
    http2: {
      totalRequests: http2Metrics.length,
      averageDuration: http2Avg,
      metrics: http2Metrics.slice(-100) // Return last 100 metrics only
    },
    websocket: {
      totalRequests: wsMetrics.length,
      averageDuration: wsAvg,
      metrics: wsMetrics.slice(-100) // Return last 100 metrics only
    }
  });
});

// Reset metrics endpoint only for HTTP/1.1
http1App.post('/api/reset', (req, res) => {
  http1Metrics = [];
  http2Metrics = [];
  wsMetrics = [];
  res.json({ status: 'Metrics reset successfully' });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    const start = performance.now();
    const data = message.toString();

    // Echo back the message
    ws.send(data);

    const duration = performance.now() - start;
    wsRequestDurationHistogram.observe(duration);

    // Store metrics for this request
    wsMetrics.push({
      timestamp: new Date().toISOString(),
      duration: duration,
      payload: message.length
    });
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// HTTP/2 server handler with CORS support
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type'
};

// Utility function to add CORS headers to any response
const addCorsHeaders = (headers) => {
  return { ...headers, ...corsHeaders };
};

http2Server.on('stream', (stream, headers) => {
  // Handle OPTIONS preflight requests
  if (headers[':method'] === 'OPTIONS') {
    stream.respond(addCorsHeaders({ ':status': 204 }));
    stream.end();
    return;
  }

  if (headers[':method'] === 'POST' && headers[':path'] === '/api/echo') {
    let data = '';

    stream.on('data', (chunk) => {
      data += chunk.toString();
    });

    stream.on('end', () => {
      const start = performance.now();
      try {
        const jsonData = JSON.parse(data);

        // Echo back the request body with CORS headers
        stream.respond(addCorsHeaders({
          'content-type': 'application/json',
          ':status': 200
        }));

        stream.end(JSON.stringify(jsonData));

        const duration = performance.now() - start;
        http2RequestDurationHistogram.observe(duration);

        // Store metrics for this request
        http2Metrics.push({
          timestamp: new Date().toISOString(),
          duration: duration,
          payload: data.length
        });
      } catch (e) {
        stream.respond(addCorsHeaders({ ':status': 400 }));
        stream.end('Invalid JSON');
      }
    });
  } else {
    stream.respond(addCorsHeaders({ ':status': 404 }));
    stream.end('Not Found');
  }
});

// Start the servers
const HTTP1_PORT = process.env.PORT || 3000;
const HTTP2_PORT = HTTP1_PORT + 1;

http1Server.listen(HTTP1_PORT, () => {
  console.log(`HTTP/1.1 Server running on port ${HTTP1_PORT}`);
  console.log(`HTTP/1.1 endpoint: http://localhost:${HTTP1_PORT}/api/echo`);
  console.log(`HTTP/1.1 Metrics endpoint: http://localhost:${HTTP1_PORT}/metrics`);
  console.log(`HTTP/1.1 Comparison endpoint: http://localhost:${HTTP1_PORT}/api/comparison`);
  console.log(`HTTP/1.1 WebSocket endpoint: ws://localhost:${HTTP1_PORT}`);
});

http2Server.listen(HTTP2_PORT, () => {
  console.log(`HTTP/2 Server running on port ${HTTP2_PORT}`);
  console.log(`HTTP/2 endpoint: https://localhost:${HTTP2_PORT}/api/echo`);
});
