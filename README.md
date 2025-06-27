# WebSocket vs HTTP Benchmark

This project provides a comprehensive benchmarking tool to compare the performance of WebSocket and HTTP REST protocols in real-time applications.

![ui.sample.png](images/ui.sample.png)

## Overview

The benchmark measures and compares the latency and throughput characteristics of WebSocket and HTTP connections, helping developers make informed decisions about which protocol is more suitable for their specific use cases.

## Features

- **Dual Protocol Testing**: Test both WebSocket and HTTP REST endpoints with the same payload and conditions
- **Configurable Parameters**: Adjust request count, payload size, and concurrency levels
- **Detailed Metrics**: View comprehensive timing data including:
  - Average request duration
  - Minimum and maximum latencies 
  - Total test completion time
  - Individual request timings
- **Visual Comparison**: Interactive charts to visualize performance differences
- **High Precision Timing**: Microsecond-level precision for accurate measurements

## Project Structure

- **`/backend`**: Node.js server implementing both WebSocket and HTTP endpoints
  - `server.js`: Express server with WebSocket support

- **`/frontend`**: Browser-based UI for running tests and viewing results
  - `index.html`: Main HTML interface
  - `app.js`: JavaScript code for the benchmark UI and test logic

## How to Use

1. Clone the repository:
   ```
   git clone https://github.com/codegik/websocket-benchmark.git
   cd websocket-benchmark
   ```
2. Start the backend server and frontend:
   ```
   ./start.sh
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:4000
   ```
4. Run your tests by the UI.

5. Stop the server when done:
   ```
   ./stop.sh
   ```

## Technical Details

- The backend implements an echo server for both protocols
- Timing is measured with microsecond precision using `performance.now()`
- Tests can be configured to simulate different real-world scenarios
- Results can be reset to run multiple test configurations
- Frontend uses vanilla JavaScript for simplicity and compatibility
- Frontend doesn't keep the websocket connection open after the test is complete, ensuring that each test run is independent and does not affect subsequent runs.


## Interpreting Results

The benchmark provides several metrics to compare the protocols:

- **Average Duration**: The mean time taken for request/response roundtrips
- **Total Test Complete**: The total time taken to complete all test requests
- **Performance Difference**: The absolute time difference between protocols
- **Speed Improvement**: Percentage improvement of the faster protocol


# Results

Based on the benchmark tests conducted, we can see clear performance differences between WebSocket and HTTP protocols across various request volumes.

## 1k requests with 10 concurrent connections
![result.1000r.10t.png](images/result.1000r.10t.png)

## 10k requests with 10 concurrent connections
![result.10000r.10t.png](images/result.10000r.10t.png)

## 100k requests with 10 concurrent connections
![result.100000r.10t.png](images/result.100000r.10t.png)

## Summary of Findings

After analyzing the results from tests with 1,000, 10,000, and 100,000 requests (all with 10 concurrent connections and 1,000 byte payloads), the following patterns emerge:


### Key Metrics

| Requests | Websocket total duration | HTTP total duration | Winner                |
|-----------|------------------------|---------------------|-----------------------|
| 1K  | 110 ms                 | 204 ms              | Websocket ~92% faster |
| 10K  | 12123 ms               | 19757 ms            | Websocket ~93% faster |
| 100K  | 120914 ms              | 219011 ms           | Websocket ~94% faster |

### Analysis

1. **Connection Overhead**: HTTP's higher latency is primarily due to the connection establishment overhead for each request, while WebSocket maintains a persistent connection.

2. **Headers and Handshaking**: HTTP requests include headers with each request, adding significant data transfer overhead compared to WebSocket's lightweight framing.

3. **Use Case Implications**: For applications requiring frequent, small message exchanges (like real-time dashboards, chat applications, or live updates), WebSockets offer substantial performance benefits.

4. **Consistently Lower Latency**: WebSocket connections demonstrate significantly lower per-request latency across all test scenarios.

5. **Scalability**: As the number of requests increases, WebSocket maintains its performance advantage, with the gap widening at higher volumes.

6. **Total Completion Time**: WebSocket tests complete much faster than equivalent HTTP tests, especially at higher request volumes.

## Conclusion

WebSockets outperform HTTP REST APIs by approximately 90-93% in these benchmark scenarios, making them the superior choice for applications requiring low-latency, high-frequency communications. 

