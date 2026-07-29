package com.marklerapp.crm.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Decides once at startup whether the global search may use PostgreSQL full-text search.
 *
 * <p>Local development runs on SQLite (dev profile, Flyway disabled), production on
 * PostgreSQL. {@code to_tsvector} exists only on the latter, so the search needs two
 * query paths. Instead of binding that to a Spring profile — which would break the
 * moment someone runs the dev profile against Postgres — this checks the actual
 * connection: PostgreSQL <em>and</em> the {@code search_vector} column from V33 present.</p>
 */
@Slf4j
@Component
public class FullTextSearchSupport {

    private final boolean available;

    public FullTextSearchSupport(DataSource dataSource) {
        this.available = detect(dataSource);
        log.info("Global search: {} backend", available ? "PostgreSQL full-text" : "portable LIKE fallback");
    }

    /**
     * @return true when tsvector queries can be executed against the current database
     */
    public boolean isAvailable() {
        return available;
    }

    private static boolean detect(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            String product = metaData.getDatabaseProductName();
            if (product == null || !product.toLowerCase().contains("postgres")) {
                return false;
            }
            try (ResultSet columns = metaData.getColumns(null, null, "clients", "search_vector")) {
                return columns.next();
            }
        } catch (SQLException e) {
            log.warn("Could not determine full-text search support, falling back to LIKE: {}", e.getMessage());
            return false;
        }
    }
}
