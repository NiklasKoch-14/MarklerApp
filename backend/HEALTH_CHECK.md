# Health Check Controller Documentation

## Overview

The HealthController provides comprehensive health monitoring endpoints for the Real Estate CRM application. These endpoints enable infrastructure monitoring, load balancer health checks, and detailed system diagnostics.

## Features

- **Overall Health Status**: Quick check for application availability
- **Database Connectivity**: Specific database health verification
- **Detailed Metrics**: Comprehensive system metrics including memory, disk, threads, and uptime
- **Build Information**: Application version and build details
- **Component Status**: Individual component health reporting
- **Proper Status Codes**: Returns HTTP 200 for healthy, 503 for unhealthy

## Endpoints

### 1. Basic Health Check

**Endpoint**: `GET /api/v1/health`

**Description**: Returns the overall health status of the application. Suitable for load balancer health checks and basic monitoring.

**Response Codes**:
- `200 OK` - Application is healthy
- `503 Service Unavailable` - Application is unhealthy

**Response Example** (Healthy):
```json
{
  "status": "UP",
  "timestamp": "2025-12-16T13:15:30.123",
  "version": "1.0.0-SNAPSHOT",
  "message": "Application is healthy and operational"
}
```

**Response Example** (Unhealthy):
```json
{
  "status": "DOWN",
  "timestamp": "2025-12-16T13:15:30.123",
  "version": "1.0.0-SNAPSHOT",
  "message": "Application is unhealthy - database connectivity issues"
}
```

**Usage**:
```bash
curl http://localhost:8085/api/v1/health
```

### 2. Database Health Check

**Endpoint**: `GET /api/v1/health/db`

**Description**: Specifically checks database connectivity by attempting to establish a connection and verifying it's valid. Useful for diagnosing database-specific issues.

**Response Codes**:
- `200 OK` - Database is accessible
- `503 Service Unavailable` - Database is unreachable

**Response Example** (Healthy):
```json
{
  "status": "UP",
  "timestamp": "2025-12-16T13:15:30.123",
  "database": "jdbc:sqlite:./data/realestate_crm.db",
  "responseTimeMs": 45,
  "message": "Database connection successful"
}
```

**Response Example** (Unhealthy):
```json
{
  "status": "DOWN",
  "timestamp": "2025-12-16T13:15:30.123",
  "database": "jdbc:sqlite:./data/realestate_crm.db",
  "responseTimeMs": 5003,
  "message": "Database connection failed"
}
```

**Usage**:
```bash
curl http://localhost:8085/api/v1/health/db
```

### 3. Detailed Health Check

**Endpoint**: `GET /api/v1/health/detailed`

**Description**: Returns comprehensive health information including system metrics, memory usage, disk space, uptime, and component status. Useful for detailed monitoring and diagnostics.

**Response Codes**:
- `200 OK` - All components are healthy
- `503 Service Unavailable` - One or more components are unhealthy

**Response Example** (Healthy):
```json
{
  "status": "UP",
  "timestamp": "2025-12-16T13:15:30.123",
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
      "message": "Free: 50.25 GB / Total: 250.00 GB"
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

**Usage**:
```bash
curl http://localhost:8085/api/v1/health/detailed
```

## Security Configuration

All health check endpoints are **publicly accessible** without authentication to support:
- Load balancer health checks
- Container orchestration (Kubernetes, Docker Swarm)
- Monitoring systems (Prometheus, Nagios, etc.)
- CI/CD pipeline health verification

The endpoints are configured in `SecurityConfig.java`:
```java
.requestMatchers("/health/**").permitAll()
```

## Integration Examples

### Docker Health Check

Add to your `Dockerfile`:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8085/api/v1/health || exit 1
```

### Docker Compose Health Check

Add to your `docker-compose.yml`:
```yaml
services:
  backend:
    image: marklerapp-backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8085/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Kubernetes Liveness Probe

Add to your Kubernetes deployment:
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 8085
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Kubernetes Readiness Probe

Add to your Kubernetes deployment:
```yaml
readinessProbe:
  httpGet:
    path: /api/v1/health/db
    port: 8085
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Prometheus Monitoring

Use with Prometheus to monitor application health:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'marklerapp-health'
    metrics_path: '/api/v1/health/detailed'
    static_configs:
      - targets: ['localhost:8085']
```

### Load Balancer Configuration (nginx)

Use for nginx upstream health checks:
```nginx
upstream backend {
    server backend1:8085 max_fails=3 fail_timeout=30s;
    server backend2:8085 max_fails=3 fail_timeout=30s;
}

server {
    location /health {
        proxy_pass http://backend/api/v1/health;
        proxy_connect_timeout 2s;
        proxy_read_timeout 5s;
    }
}
```

## Metrics Explained

### Memory Metrics

- **memoryUsedMb**: Current memory usage in megabytes
- **memoryMaxMb**: Maximum memory available to JVM (based on -Xmx)
- **memoryFreeMb**: Free memory available for allocation
- **memoryUsagePercent**: Percentage of maximum memory currently in use

### System Metrics

- **processors**: Number of CPU cores available to the JVM
- **activeThreads**: Number of currently active threads
- **uptimeSeconds**: Application uptime in seconds since startup
- **uptimeFormatted**: Human-readable uptime format (days, hours, minutes, seconds)

### Component Status Values

- **UP**: Component is healthy and operational
- **DOWN**: Component is unhealthy or unreachable
- **WARNING**: Component is operational but has issues (e.g., low disk space)

## Best Practices

### 1. Use Different Endpoints for Different Purposes

- **Load Balancers**: Use `/health` for quick checks
- **Container Orchestration**: Use `/health/db` to verify database connectivity
- **Monitoring Dashboards**: Use `/health/detailed` for comprehensive metrics

### 2. Set Appropriate Timeouts

Configure reasonable timeouts based on your infrastructure:
- **Development**: 5-10 seconds
- **Production**: 2-5 seconds
- **Database Checks**: 5-10 seconds (database may be slower to respond)

### 3. Configure Retry Logic

Implement retry logic to avoid false positives:
- Minimum 3 retries before marking unhealthy
- Use exponential backoff between retries
- Consider network latency and database startup time

### 4. Monitor Response Times

Track health check response times to detect performance degradation:
- Alert if response time > 1 second
- Investigate if response time > 2 seconds
- Consider scaling if consistent high response times

### 5. Log Health Check Failures

The controller logs warnings for failed health checks:
```java
log.warn("Health check failed: Database connectivity issues");
```

Monitor these logs for troubleshooting.

## Troubleshooting

### Health Check Returns 503

1. **Check Database Connectivity**:
   ```bash
   curl http://localhost:8085/api/v1/health/db
   ```

2. **Verify Database is Running**:
   - SQLite: Check file exists at `./data/realestate_crm.db`
   - PostgreSQL: Verify container is running and accessible

3. **Check Application Logs**:
   ```bash
   docker logs marklerapp-backend
   ```

### Health Check Times Out

1. **Increase Timeout Settings**: Application may need more time to respond
2. **Check System Resources**: Memory or CPU constraints may slow response
3. **Verify Network Connectivity**: Ensure no network issues between caller and application

### Database Check Fails but Application Runs

1. **Connection Pool Issues**: May have exhausted database connections
2. **Database Overloaded**: Database may be slow to respond
3. **Network Issues**: Intermittent network connectivity to database

## Development

### Adding New Health Components

To add a new component to the detailed health check:

1. Add component check to `gatherComponentHealth()`:
```java
private Map<String, ComponentHealth> gatherComponentHealth(boolean dbHealthy) {
    Map<String, ComponentHealth> components = new HashMap<>();

    // Existing components...

    // Add new component
    components.put("myComponent", ComponentHealth.builder()
        .status(checkMyComponent() ? "UP" : "DOWN")
        .message("Component status message")
        .build());

    return components;
}
```

2. Implement the component check method:
```java
private boolean checkMyComponent() {
    try {
        // Your component health logic
        return true;
    } catch (Exception e) {
        log.error("Component check failed", e);
        return false;
    }
}
```

### Customizing Response Format

The response DTOs use Lombok `@Builder` pattern. Modify the inner classes to add new fields:

```java
@Data
@Builder
public static class HealthResponse {
    private String status;
    private LocalDateTime timestamp;
    private String version;
    private String message;
    // Add new field
    private String environment;
}
```

## API Documentation

Full API documentation is available through Swagger UI:
- Development: http://localhost:8085/swagger-ui.html
- Look for "Health Check" tag in the API documentation

## Related Configuration

- **application.yml**: Spring Boot Actuator configuration
- **SecurityConfig.java**: Security permissions for health endpoints
- **AppConfig.java**: Build properties configuration

## Performance Impact

Health check endpoints are designed to be lightweight:
- Basic health check: < 10ms response time
- Database check: < 50ms response time (database dependent)
- Detailed check: < 100ms response time

These endpoints use minimal resources and can be called frequently (every 5-10 seconds) without impacting application performance.
