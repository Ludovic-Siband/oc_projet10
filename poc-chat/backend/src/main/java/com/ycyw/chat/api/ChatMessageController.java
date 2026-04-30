package com.ycyw.chat.api;

import com.ycyw.chat.dto.SendMessageRequest;
import com.ycyw.chat.model.ChatMessage;
import com.ycyw.chat.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatMessageController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Valid SendMessageRequest request) {
        ChatMessage createdMessage = chatService.addMessage(
            request.conversationId(),
            request.senderRole(),
            request.senderId(),
            request.body()
        );

        messagingTemplate.convertAndSend("/topic/conversations." + request.conversationId(), createdMessage);
        messagingTemplate.convertAndSend("/topic/conversations", chatService.getConversationSummary(request.conversationId()));
    }
}
