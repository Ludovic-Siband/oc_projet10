package com.ycyw.chat.model;

import java.time.Instant;

public record ChatMessage(
    String id,
    String conversationId,
    SenderRole senderRole,
    String senderId,
    String body,
    Instant sentAt
) {
}
