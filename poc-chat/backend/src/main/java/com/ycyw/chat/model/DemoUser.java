package com.ycyw.chat.model;

import java.time.Instant;

public record DemoUser(
    String id,
    String displayName,
    Instant createdAt
) {
}
