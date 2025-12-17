# Health Check Endpoint Examples

This document provides real-world example requests and responses for all health check endpoints.

## 1. Basic Health Check

### Request
```bash
GET /api/v1/health HTTP/1.1
Host: localhost:8085
```

```bash
curl http://localhost:8085/api/v1/health
```

### Response (Healthy)
**Status**: 200 OK
```json
{
  "status": "UP",
  "timestamp": "2025-12-16T13:15:30.123",
  "version": "1.0.0-SNAPSHOT",
  "message": "Application is healthy and operational"
}
```

### Response (Unhealthy)
**Status**: 503 Service Unavailable
```json
{
  "status": "DOWN",
  "timestamp": "2025-12-16T13:15:30.123",
  "version": "1.0.0-SNAPSHOT",
  "message": "Application is unhealthy - database connectivity issues"
}
```

---

## 2. Database Health Check

### Request
```bash
GET /api/v1/health/db HTTP/1.1
Host: localhost:8085
```

```bash
curl http://localhost:8085/api/v1/health/db
```

### Response (Healthy - SQLite)
**Status**: 200 OK
```json
{
  "status": "UP",
  "timestamp": "2025-12-16T13:15:30.456",
  "database": "jdbc:sqlite:./data/realestate_crm.db",
  "responseTimeMs": 45,
  "message": "Database connection successful"
}
```

### Response (Healthy - PostgreSQL)
**Status**: 200 OK
```json
{
  "status": "UP",
  "timestamp": "2025-12-16T13:15:30.456",
  "database": "jdbc:postgresql://database:5432/realestate_crm",
  "responseTimeMs": 67,
  "message": "Database connection successful"
}
```

### Response (Unhealthy)
**Status**: 503 Service Unavailable
```json
{
  "status": "DOWN",
  "timestamp": "2025-12-16T13:15:30.456",
  "database": "jdbc:sqlite:./data/realestate_crm.db",
  "responseTimeMs": 5003,
  "message": "Database connection failed"
}
```

---

## 3. Detailed Health Check

### Request
```bash
GET /api/v1/health/detailed HTTP/1.1
Host: localhost:8085
```

```bash
curl http://localhost:8085/api/v1/health/detailed
```

### Response (Healthy)
**Status**: 200 OK
```json
{
  "status": "UP",
  "timestamp": "2025-12-16T13:15:30.789",
  "application": {
    "name": "Real Estate CRM",
    "version": "1.0.0-SNAPSHOT",
    "buildTime": "2025-12-16T12:00:00.000Z",
    "javaVersion": "17.0.9",
    "springBootVersion": "3.2.0"
  },
  "components": {
    "database": {
      "status": "UP",
      "message": "Database connection successful"
    },
    "application": {
      "status": "UP",
      "message": "Application is running"
    },
    "diskSpace": {
      "status": "UP",
      "message": "Free: 220.86 GB / Total: 475.72 GB"
    }
  },
  "system": {
    "memoryUsedMb": 256,
    "memoryMaxMb": 1024,
    "memoryFreeMb": 768,
    "memoryUsagePercent": 25,
    "processors": 8,
    "activeThreads": 42,
    "uptimeSeconds": 3600,
    "uptimeFormatted": "0d 1h 0m 0s"
  }
}
```

### Response (Unhealthy - Low Disk Space)
**Status**: 503 Service Unavailable
```json
{
  "status": "DOWN",
  "timestamp": "2025-12-16T13:15:30.789",
  "application": {
    "name": "Real Estate CRM",
    "version": "1.0.0-SNAPSHOT",
    "buildTime": "2025-12-16T12:00:00.000Z",
    "javaVersion": "17.0.9",
    "springBootVersion": "3.2.0"
  },
  "components": {
    "database": {
      "status": "UP",
      "message": "Database connection successful"
    },
    "application": {
      "status": "UP",
      "message": "Application is running"
    },
    "diskSpace": {
      "status": "WARNING",
      "message": "Free: 2.50 GB / Total: 475.72 GB"
    }
  },
  "system": {
    "memoryUsedMb": 896,
    "memoryMaxMb": 1024,
    "memoryFreeMb": 128,
    "memoryUsagePercent": 87,
    "processors": 8,
    "activeThreads": 156,
    "uptimeSeconds": 86400,
    "uptimeFormatted": "1d 0h 0m 0s"
  }
}
```

### Response (Unhealthy - Database Down)
**Status**: 503 Service Unavailable
```json
{
  "status": "DOWN",
  "timestamp": "2025-12-16T13:15:30.789",
  "application": {
    "name": "Real Estate CRM",
    "version": "1.0.0-SNAPSHOT",
    "buildTime": "2025-12-16T12:00:00.000Z",
    "javaVersion": "17.0.9",
    "springBootVersion": "3.2.0"
  },
  "components": {
    "database": {
      "status": "DOWN",
      "message": "Database connection failed"
    },
    "application": {
      "status": "UP",
      "message": "Application is running"
    },
    "diskSpace": {
      "status": "UP",
      "message": "Free: 220.86 GB / Total: 475.72 GB"
    }
  },
  "system": {
    "memoryUsedMb": 512,
    "memoryMaxMb": 1024,
    "memoryFreeMb": 512,
    "memoryUsagePercent": 50,
    "processors": 8,
    "activeThreads": 67,
    "uptimeSeconds": 7200,
    "uptimeFormatted": "0d 2h 0m 0s"
  }
}
```

---

## Using with HTTPie

HTTPie is a user-friendly HTTP client. Here are examples:

```bash
# Basic health check
http GET localhost:8085/api/v1/health

# Database health check
http GET localhost:8085/api/v1/health/db

# Detailed health check with pretty JSON
http GET localhost:8085/api/v1/health/detailed --print=hb --pretty=all
```

---

## Using with wget

```bash
# Download health check response
wget -O health.json http://localhost:8085/api/v1/health

# Check status and exit with appropriate code
wget --spider -q http://localhost:8085/api/v1/health && echo "Healthy" || echo "Unhealthy"
```

---

## Using with Postman

1. Create new request: `GET http://localhost:8085/api/v1/health`
2. Click "Send"
3. View response in "Body" tab
4. Check "Status" shows 200 OK for healthy or 503 for unhealthy

---

## Monitoring Script Example

### Bash Script
```bash
#!/bin/bash

# Health check script for MarklerApp
URL="http://localhost:8085/api/v1/health"

response=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $response -eq 200 ]; then
    echo "$(date): Application is healthy (HTTP $response)"
    exit 0
else
    echo "$(date): Application is unhealthy (HTTP $response)"
    exit 1
fi
```

### PowerShell Script
```powershell
# Health check script for MarklerApp
$url = "http://localhost:8085/api/v1/health"

try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "$(Get-Date): Application is healthy (HTTP $($response.StatusCode))"
        exit 0
    }
} catch {
    Write-Host "$(Get-Date): Application is unhealthy ($_)"
    exit 1
}
```

### Python Script
```python
#!/usr/bin/env python3
import requests
import sys
from datetime import datetime

url = "http://localhost:8085/api/v1/health"

try:
    response = requests.get(url, timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f"{datetime.now()}: Application is healthy")
        print(f"Status: {data['status']}")
        print(f"Version: {data['version']}")
        sys.exit(0)
    else:
        print(f"{datetime.now()}: Application is unhealthy (HTTP {response.status_code})")
        sys.exit(1)
except Exception as e:
    print(f"{datetime.now()}: Health check failed: {e}")
    sys.exit(1)
```

---

## Load Balancer Configuration Examples

### nginx
```nginx
upstream marklerapp_backend {
    server backend1:8085 max_fails=3 fail_timeout=30s;
    server backend2:8085 max_fails=3 fail_timeout=30s;

    # Health check (nginx Plus)
    health_check interval=10s fails=3 passes=2 uri=/api/v1/health match=health_ok;
}

match health_ok {
    status 200;
    header Content-Type = "application/json";
    body ~ "UP";
}
```

### HAProxy
```haproxy
backend marklerapp_backend
    balance roundrobin
    option httpchk GET /api/v1/health
    http-check expect status 200
    http-check expect string "UP"
    server backend1 backend1:8085 check inter 10s fall 3 rise 2
    server backend2 backend2:8085 check inter 10s fall 3 rise 2
```

### AWS Application Load Balancer (ALB)
```json
{
  "HealthCheckPath": "/api/v1/health",
  "HealthCheckProtocol": "HTTP",
  "HealthCheckPort": "8085",
  "HealthCheckIntervalSeconds": 30,
  "HealthCheckTimeoutSeconds": 5,
  "HealthyThresholdCount": 2,
  "UnhealthyThresholdCount": 3,
  "Matcher": {
    "HttpCode": "200"
  }
}
```

---

## Prometheus Monitoring

### Metrics Endpoint Configuration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'marklerapp'
    metrics_path: '/api/v1/health/detailed'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:8085']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

### Grafana Dashboard Query Examples
```promql
# Memory usage percentage
system_memory_usage_percent

# Active threads
system_active_threads

# Uptime
system_uptime_seconds

# Component health
component_health{component="database"}
```

---

## Kubernetes Health Probes

### Complete Deployment with Health Checks
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: marklerapp-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: marklerapp-backend
  template:
    metadata:
      labels:
        app: marklerapp-backend
    spec:
      containers:
      - name: backend
        image: marklerapp-backend:latest
        ports:
        - containerPort: 8085

        # Liveness probe - restart if unhealthy
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8085
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe - remove from load balancer if not ready
        readinessProbe:
          httpGet:
            path: /api/v1/health/db
            port: 8085
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        # Startup probe - for slow-starting applications
        startupProbe:
          httpGet:
            path: /api/v1/health
            port: 8085
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30  # 5 minutes to start (30 * 10s)
```

---

## Testing Different Scenarios

### Scenario 1: Application Starting Up
```bash
# Immediately after start
curl http://localhost:8085/api/v1/health

# Expected: May return 503 or connection refused while starting
# After 30-60 seconds: Should return 200 OK
```

### Scenario 2: Database Connection Lost
```bash
# Stop database
docker stop marklerapp-database

# Check health
curl http://localhost:8085/api/v1/health
# Expected: 503 Service Unavailable

# Check detailed health
curl http://localhost:8085/api/v1/health/detailed
# Expected: 503 with database component DOWN
```

### Scenario 3: High Memory Usage
```bash
# Check detailed health during heavy load
curl http://localhost:8085/api/v1/health/detailed

# Look for high memoryUsagePercent
# Example response shows 87% memory usage
```

---

## Integration Testing

### Jest/JavaScript Test
```javascript
describe('Health Endpoints', () => {
  test('basic health check returns 200', async () => {
    const response = await fetch('http://localhost:8085/api/v1/health');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('UP');
    expect(data.version).toBeDefined();
  });

  test('detailed health includes system metrics', async () => {
    const response = await fetch('http://localhost:8085/api/v1/health/detailed');
    const data = await response.json();

    expect(data.system.memoryUsedMb).toBeGreaterThan(0);
    expect(data.system.processors).toBeGreaterThan(0);
    expect(data.components.database.status).toBe('UP');
  });
});
```

### pytest/Python Test
```python
import pytest
import requests

BASE_URL = "http://localhost:8085/api/v1"

def test_basic_health():
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'UP'
    assert 'version' in data

def test_detailed_health():
    response = requests.get(f"{BASE_URL}/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert 'system' in data
    assert data['system']['memoryUsedMb'] > 0
    assert data['components']['database']['status'] == 'UP'
```

---

**Note**: All examples assume the application is running on `localhost:8085`. Adjust the host and port according to your deployment environment.
