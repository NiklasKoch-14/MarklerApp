package com.marklerapp.crm.rules;

import java.util.List;
import java.util.UUID;

public record CascadeAction(CascadeType action, String messageKey, List<UUID> ids) {
}
