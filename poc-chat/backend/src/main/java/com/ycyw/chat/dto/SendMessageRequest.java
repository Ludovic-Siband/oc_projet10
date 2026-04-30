package com.ycyw.chat.dto;

import com.ycyw.chat.model.SenderRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SendMessageRequest(
    @NotBlank String conversationId,
    @NotNull SenderRole senderRole,
    @NotBlank String senderId,
    @NotBlank String body
) {
}
