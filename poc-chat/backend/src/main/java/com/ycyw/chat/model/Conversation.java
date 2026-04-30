package com.ycyw.chat.model;

import java.time.Instant;

public record Conversation(
    String id,
    String userId,
    String status,
    Instant createdAt
) {
}
