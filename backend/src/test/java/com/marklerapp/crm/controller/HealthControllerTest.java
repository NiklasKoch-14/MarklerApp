package com.marklerapp.crm.controller;

import com.marklerapp.crm.controller.HealthController.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.Instant;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.atLeastOnce;

/**
 * Unit tests for HealthController.
 *
 * <p>Tests verify health check endpoints return correct status codes and
 * response structures for both healthy and unhealthy scenarios.</p>
 */
@ExtendWith(MockitoExtension.class)
class HealthControllerTest {

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @Mock
    private DatabaseMetaData databaseMetaData;

    private BuildProperties buildProperties;

    @InjectMocks
    private HealthController healthController;

    @BeforeEach
    void setUp() {
        // Create BuildProperties with test data
        Properties properties = new Properties();
        properties.put("group", "com.marklerapp");
        properties.put("artifact", "realestate-crm");
        properties.put("name", "Real Estate CRM Backend");
        properties.put("version", "1.0.0-TEST");
        properties.put("time", Instant.now().toString());

        buildProperties = new BuildProperties(properties);

        // Manually inject BuildProperties since @InjectMocks doesn't handle it
        healthController = new HealthController(dataSource, buildProperties);
    }

    // ========================================
    // Basic Health Check Tests
    // ========================================

    @Test
    void health_ShouldReturnUp_WhenDatabaseIsHealthy() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        // Act
        ResponseEntity<HealthResponse> response = healthController.health();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().getStatus());
        assertEquals("1.0.0-TEST", response.getBody().getVersion());
        assertTrue(response.getBody().getMessage().contains("healthy"));

        verify(dataSource, times(1)).getConnection();
        verify(connection, times(1)).isValid(5);
        verify(connection, times(1)).close();
    }

    @Test
    void health_ShouldReturnDown_WhenDatabaseIsUnhealthy() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(false);

        // Act
        ResponseEntity<HealthResponse> response = healthController.health();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DOWN", response.getBody().getStatus());
        assertEquals("1.0.0-TEST", response.getBody().getVersion());
        assertTrue(response.getBody().getMessage().contains("unhealthy"));

        verify(dataSource, times(1)).getConnection();
        verify(connection, times(1)).isValid(5);
        verify(connection, times(1)).close();
    }

    @Test
    void health_ShouldReturnDown_WhenDatabaseConnectionFails() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenThrow(new RuntimeException("Connection failed"));

        // Act
        ResponseEntity<HealthResponse> response = healthController.health();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DOWN", response.getBody().getStatus());
        assertNotNull(response.getBody().getMessage());
        assertTrue(response.getBody().getMessage().length() > 0);

        verify(dataSource, times(1)).getConnection();
    }

    // ========================================
    // Database Health Check Tests
    // ========================================

    @Test
    void databaseHealth_ShouldReturnUp_WhenDatabaseIsHealthy() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);
        when(connection.getMetaData()).thenReturn(databaseMetaData);
        when(databaseMetaData.getURL()).thenReturn("jdbc:sqlite:./data/test.db");

        // Act
        ResponseEntity<DatabaseHealthResponse> response = healthController.databaseHealth();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().getStatus());
        assertTrue(response.getBody().getDatabase().contains("sqlite"));
        assertTrue(response.getBody().getResponseTimeMs() >= 0);
        assertTrue(response.getBody().getMessage().contains("successful"));

        verify(dataSource, times(2)).getConnection(); // Called twice: once for check, once for URL
    }

    @Test
    void databaseHealth_ShouldReturnDown_WhenDatabaseIsUnhealthy() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(false);
        when(connection.getMetaData()).thenReturn(databaseMetaData);
        when(databaseMetaData.getURL()).thenReturn("jdbc:sqlite:./data/test.db");

        // Act
        ResponseEntity<DatabaseHealthResponse> response = healthController.databaseHealth();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DOWN", response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("failed"));

        verify(dataSource, times(2)).getConnection();
    }

    @Test
    void databaseHealth_ShouldReturnDown_WhenExceptionOccurs() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenThrow(new RuntimeException("Database error"));

        // Act
        ResponseEntity<DatabaseHealthResponse> response = healthController.databaseHealth();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DOWN", response.getBody().getStatus());
        assertNotNull(response.getBody().getMessage());
        assertTrue(response.getBody().getMessage().length() > 0);

        // Verify getConnection was called (could be 1 or 2 times depending on extractDatabaseUrl)
        verify(dataSource, atLeastOnce()).getConnection();
    }

    // ========================================
    // Detailed Health Check Tests
    // ========================================

    @Test
    void detailedHealth_ShouldReturnUp_WhenAllComponentsHealthy() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        // Act
        ResponseEntity<DetailedHealthResponse> response = healthController.detailedHealth();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().getStatus());

        // Verify application info
        ApplicationInfo appInfo = response.getBody().getApplication();
        assertNotNull(appInfo);
        assertEquals("Real Estate CRM", appInfo.getName());
        assertEquals("1.0.0-TEST", appInfo.getVersion());
        assertNotNull(appInfo.getJavaVersion());
        assertNotNull(appInfo.getSpringBootVersion());

        // Verify components
        assertNotNull(response.getBody().getComponents());
        assertTrue(response.getBody().getComponents().containsKey("database"));
        assertTrue(response.getBody().getComponents().containsKey("application"));
        assertEquals("UP", response.getBody().getComponents().get("database").getStatus());
        assertEquals("UP", response.getBody().getComponents().get("application").getStatus());

        // Verify system metrics
        SystemMetrics systemMetrics = response.getBody().getSystem();
        assertNotNull(systemMetrics);
        assertTrue(systemMetrics.getMemoryUsedMb() >= 0);
        assertTrue(systemMetrics.getMemoryMaxMb() > 0);
        assertTrue(systemMetrics.getProcessors() > 0);
        assertTrue(systemMetrics.getActiveThreads() > 0);
        assertTrue(systemMetrics.getUptimeSeconds() >= 0);
        assertNotNull(systemMetrics.getUptimeFormatted());

        verify(dataSource, times(1)).getConnection();
    }

    @Test
    void detailedHealth_ShouldReturnDown_WhenDatabaseUnhealthy() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(false);

        // Act
        ResponseEntity<DetailedHealthResponse> response = healthController.detailedHealth();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DOWN", response.getBody().getStatus());

        // Database component should be DOWN
        assertEquals("DOWN", response.getBody().getComponents().get("database").getStatus());

        verify(dataSource, times(1)).getConnection();
    }

    @Test
    void detailedHealth_ShouldReturnDown_WhenExceptionOccurs() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenThrow(new RuntimeException("Critical error"));

        // Act
        ResponseEntity<DetailedHealthResponse> response = healthController.detailedHealth();

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DOWN", response.getBody().getStatus());

        verify(dataSource, times(1)).getConnection();
    }

    // ========================================
    // Response Structure Tests
    // ========================================

    @Test
    void healthResponse_ShouldContainAllRequiredFields() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        // Act
        ResponseEntity<HealthResponse> response = healthController.health();

        // Assert
        HealthResponse body = response.getBody();
        assertNotNull(body);
        assertNotNull(body.getStatus());
        assertNotNull(body.getTimestamp());
        assertNotNull(body.getVersion());
        assertNotNull(body.getMessage());
    }

    @Test
    void databaseHealthResponse_ShouldContainAllRequiredFields() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);
        when(connection.getMetaData()).thenReturn(databaseMetaData);
        when(databaseMetaData.getURL()).thenReturn("jdbc:sqlite:./data/test.db");

        // Act
        ResponseEntity<DatabaseHealthResponse> response = healthController.databaseHealth();

        // Assert
        DatabaseHealthResponse body = response.getBody();
        assertNotNull(body);
        assertNotNull(body.getStatus());
        assertNotNull(body.getTimestamp());
        assertNotNull(body.getDatabase());
        assertNotNull(body.getResponseTimeMs());
        assertNotNull(body.getMessage());
    }

    @Test
    void detailedHealthResponse_ShouldContainAllRequiredFields() throws Exception {
        // Arrange
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        // Act
        ResponseEntity<DetailedHealthResponse> response = healthController.detailedHealth();

        // Assert
        DetailedHealthResponse body = response.getBody();
        assertNotNull(body);
        assertNotNull(body.getStatus());
        assertNotNull(body.getTimestamp());
        assertNotNull(body.getApplication());
        assertNotNull(body.getComponents());
        assertNotNull(body.getSystem());
    }
}
