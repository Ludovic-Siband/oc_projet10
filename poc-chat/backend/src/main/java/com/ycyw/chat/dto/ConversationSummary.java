package com.ycyw.chat.dto;

import java.time.Instant;

public record ConversationSummary(
    String id,
    String userId,
    String userDisplayName,
    Instant createdAt,
    Instant lastMessageAt,
    String lastMessagePreview
) {
}
