package com.ycyw.chat.service;

import com.ycyw.chat.dto.ConversationSummary;
import com.ycyw.chat.dto.CreateDemoUserResponse;
import com.ycyw.chat.exception.NotFoundException;
import com.ycyw.chat.model.ChatMessage;
import com.ycyw.chat.model.Conversation;
import com.ycyw.chat.model.DemoUser;
import com.ycyw.chat.model.SenderRole;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private static final String CONVERSATION_STATUS_OPEN = "OPEN";
    private static final String USER_NAME_PREFIX = "Client";

    private final Map<String, DemoUser> usersById = new ConcurrentHashMap<>();
    private final Map<String, Conversation> conversationsById = new ConcurrentHashMap<>();
    private final Map<String, String> conversationIdByUserId = new ConcurrentHashMap<>();
    private final Map<String, List<ChatMessage>> messagesByConversationId = new ConcurrentHashMap<>();
    private final AtomicInteger userCounter = new AtomicInteger();

    public synchronized CreateDemoUserResponse createDemoUser() {
        String userId = UUID.randomUUID().toString();
        String conversationId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        String displayName = USER_NAME_PREFIX + " " + userCounter.incrementAndGet();

        DemoUser user = new DemoUser(userId, displayName, now);
        Conversation conversation = new Conversation(conversationId, userId, CONVERSATION_STATUS_OPEN, now);

        usersById.put(userId, user);
        conversationsById.put(conversationId, conversation);
        conversationIdByUserId.put(userId, conversationId);
        messagesByConversationId.put(conversationId, new CopyOnWriteArrayList<>());

        return new CreateDemoUserResponse(user.id(), user.displayName(), user.createdAt(), conversationId);
    }

    public List<DemoUser> listUsers() {
        return usersById.values().stream()
            .sorted(Comparator.comparing(DemoUser::createdAt))
            .toList();
    }

    public List<ConversationSummary> listConversationSummaries() {
        return conversationsById.values().stream()
            .map(this::toSummary)
            .sorted(Comparator
                .comparing(ConversationSummary::lastMessageAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ConversationSummary::createdAt, Comparator.reverseOrder()))
            .toList();
    }

    public List<ChatMessage> listMessages(String conversationId) {
        requireConversation(conversationId);
        return messagesByConversationId.getOrDefault(conversationId, List.of()).stream()
            .sorted(Comparator.comparing(ChatMessage::sentAt))
            .toList();
    }

    public ChatMessage addMessage(String conversationId, SenderRole senderRole, String senderId, String body) {
        Conversation conversation = requireConversation(conversationId);
        validateSender(conversation, senderRole, senderId);

        ChatMessage message = new ChatMessage(
            UUID.randomUUID().toString(),
            conversationId,
            senderRole,
            senderId,
            body.trim(),
            Instant.now()
        );

        messagesByConversationId.computeIfAbsent(conversationId, ignored -> new CopyOnWriteArrayList<>()).add(message);
        return message;
    }

    public ConversationSummary getConversationSummary(String conversationId) {
        return toSummary(requireConversation(conversationId));
    }

    private Conversation requireConversation(String conversationId) {
        Conversation conversation = conversationsById.get(conversationId);
        if (conversation == null) {
            throw new NotFoundException("Conversation " + conversationId + " was not found");
        }
        return conversation;
    }

    private void validateSender(Conversation conversation, SenderRole senderRole, String senderId) {
        if (senderRole == SenderRole.CLIENT && !conversation.userId().equals(senderId)) {
            throw new NotFoundException("Client sender does not match the active conversation");
        }
    }

    private ConversationSummary toSummary(Conversation conversation) {
        DemoUser user = usersById.get(conversation.userId());
        List<ChatMessage> messages = new ArrayList<>(messagesByConversationId.getOrDefault(conversation.id(), List.of()));
        ChatMessage lastMessage = messages.stream()
            .max(Comparator.comparing(ChatMessage::sentAt))
            .orElse(null);

        return new ConversationSummary(
            conversation.id(),
            conversation.userId(),
            user != null ? user.displayName() : "Unknown user",
            conversation.createdAt(),
            lastMessage != null ? lastMessage.sentAt() : null,
            lastMessage != null ? lastMessage.body() : null
        );
    }
}
