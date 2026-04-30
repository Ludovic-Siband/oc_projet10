package com.ycyw.chat.dto;

import java.time.Instant;

public record CreateDemoUserResponse(
    String id,
    String displayName,
    Instant createdAt,
    String conversationId
) {
}
