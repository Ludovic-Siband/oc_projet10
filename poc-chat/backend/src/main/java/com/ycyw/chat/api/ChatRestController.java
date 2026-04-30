package com.ycyw.chat.api;

import com.ycyw.chat.dto.ConversationSummary;
import com.ycyw.chat.dto.CreateDemoUserResponse;
import com.ycyw.chat.model.ChatMessage;
import com.ycyw.chat.model.DemoUser;
import com.ycyw.chat.service.ChatService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ChatRestController {

    private final ChatService chatService;

    public ChatRestController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/demo-users")
    public CreateDemoUserResponse createDemoUser() {
        return chatService.createDemoUser();
    }

    @GetMapping("/demo-users")
    public List<DemoUser> listUsers() {
        return chatService.listUsers();
    }

    @GetMapping("/conversations")
    public List<ConversationSummary> listConversations() {
        return chatService.listConversationSummaries();
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<ChatMessage> listMessages(@PathVariable String conversationId) {
        return chatService.listMessages(conversationId);
    }
}
