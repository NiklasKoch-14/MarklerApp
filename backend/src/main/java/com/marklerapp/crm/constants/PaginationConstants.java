package com.marklerapp.crm.constants;

import org.springframework.data.domain.Sort;

/**
 * Centralized pagination constants for consistent API behavior across all controllers.
 *
 * @author Claude Sonnet 4.5
 * @since Phase 7.1 - Code Quality Improvements
 */
public final class PaginationConstants {

    private PaginationConstants() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final String DEFAULT_SORT_FIELD = "createdAt";
    public static final Sort.Direction DEFAULT_SORT_DIRECTION = Sort.Direction.DESC;
}
