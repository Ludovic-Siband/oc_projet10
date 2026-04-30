export type SenderRole = 'CLIENT' | 'SUPPORT';

export interface DemoUser {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface CreateDemoUserResponse extends DemoUser {
  conversationId: string;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  userDisplayName: string;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderRole: SenderRole;
  senderId: string;
  body: string;
  sentAt: string;
}

export interface SendMessageCommand {
  conversationId: string;
  senderRole: SenderRole;
  senderId: string;
  body: string;
}
