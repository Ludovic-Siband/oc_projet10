import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatApiService } from './chat-api.service';
import { ChatSocketService } from './chat-socket.service';
import {
  ChatMessage,
  ConversationSummary,
  CreateDemoUserResponse,
  DemoUser,
  SenderRole
} from './chat.models';

@Component({
  selector: 'app-root',
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChatApiService, ChatSocketService]
})
export class App {
  private readonly api = inject(ChatApiService);
  private readonly socket = inject(ChatSocketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly supportSenderId = 'support';
  private readonly localStorageUsersKey = 'ycyw-chat-users';
  private readonly localStorageActiveUserKey = 'ycyw-chat-active-user-id';

  protected readonly users = signal<DemoUser[]>([]);
  protected readonly conversations = signal<ConversationSummary[]>([]);
  protected readonly activeClientUserId = signal<string | null>(null);
  protected readonly activeSupportConversationId = signal<string | null>(null);
  protected readonly clientMessages = signal<ChatMessage[]>([]);
  protected readonly supportMessages = signal<ChatMessage[]>([]);
  protected readonly clientDraft = signal('');
  protected readonly supportDraft = signal('');
  protected readonly isCreatingUser = signal(false);
  protected readonly isBootstrapping = signal(true);

  protected readonly activeClientUser = computed(
    () => this.users().find((user) => user.id === this.activeClientUserId()) ?? null
  );
  protected readonly activeClientConversation = computed(
    () =>
      this.conversations().find((conversation) => conversation.userId === this.activeClientUserId()) ?? null
  );
  protected readonly activeSupportConversation = computed(
    () =>
      this.conversations().find((conversation) => conversation.id === this.activeSupportConversationId()) ?? null
  );

  constructor() {
    effect(() => {
      const users = this.users();
      if (users.length > 0) {
        localStorage.setItem(this.localStorageUsersKey, JSON.stringify(users));
      }
    });

    effect(() => {
      const activeUserId = this.activeClientUserId();
      if (activeUserId) {
        localStorage.setItem(this.localStorageActiveUserKey, activeUserId);
      }
    });

    effect(() => {
      const conversationId = this.activeClientConversation()?.id;
      if (conversationId) {
        this.socket.watchConversation(conversationId);
      }
    });

    effect(() => {
      const conversationId = this.activeSupportConversation()?.id;
      if (conversationId) {
        this.socket.watchConversation(conversationId);
      }
    });

    this.bootstrap();
  }

  protected createDemoUser(): void {
    this.isCreatingUser.set(true);
    this.api
      .createDemoUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.handleCreatedUser(response),
        error: () => this.isCreatingUser.set(false)
      });
  }

  protected onClientUserChange(userId: string): void {
    this.activeClientUserId.set(userId || null);
    const conversation = this.conversations().find((item) => item.userId === userId);
    if (conversation) {
      this.loadConversationMessages(conversation.id, 'client');
    } else {
      this.clientMessages.set([]);
    }
  }

  protected selectSupportConversation(conversationId: string): void {
    this.activeSupportConversationId.set(conversationId);
    this.loadConversationMessages(conversationId, 'support');
  }

  protected sendClientMessage(): void {
    const conversation = this.activeClientConversation();
    const user = this.activeClientUser();
    const body = this.clientDraft().trim();
    if (!conversation || !user || !body) {
      return;
    }

    this.socket.sendMessage({
      conversationId: conversation.id,
      senderRole: 'CLIENT',
      senderId: user.id,
      body
    });
    this.clientDraft.set('');
  }

  protected sendSupportMessage(): void {
    const conversation = this.activeSupportConversation();
    const body = this.supportDraft().trim();
    if (!conversation || !body) {
      return;
    }

    this.socket.sendMessage({
      conversationId: conversation.id,
      senderRole: 'SUPPORT',
      senderId: this.supportSenderId,
      body
    });
    this.supportDraft.set('');
  }

  protected isOutgoingMessage(message: ChatMessage, role: SenderRole): boolean {
    return message.senderRole === role;
  }

  private bootstrap(): void {
    this.restoreUsersFromLocalStorage();
    this.socket.connect();
    this.subscribeToConversationSummaries();
    this.subscribeToMessages();

    this.api
      .listUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.restoreActiveClientUser();
          this.loadConversations();
        },
        error: () => {
          this.restoreActiveClientUser();
          this.loadConversations();
        }
      });
  }

  private restoreUsersFromLocalStorage(): void {
    const rawUsers = localStorage.getItem(this.localStorageUsersKey);
    if (!rawUsers) {
      return;
    }

    try {
      this.users.set(JSON.parse(rawUsers) as DemoUser[]);
    } catch {
      localStorage.removeItem(this.localStorageUsersKey);
    }
  }

  private restoreActiveClientUser(): void {
    const savedUserId = localStorage.getItem(this.localStorageActiveUserKey);
    const users = this.users();
    if (savedUserId && users.some((user) => user.id === savedUserId)) {
      this.activeClientUserId.set(savedUserId);
      return;
    }
    if (users.length > 0) {
      this.activeClientUserId.set(users[0].id);
    }
  }

  private loadConversations(): void {
    this.api
      .listConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversations) => {
          this.conversations.set(conversations);
          this.syncActiveConversations(conversations);
          this.isBootstrapping.set(false);
        },
        error: () => this.isBootstrapping.set(false)
      });
  }

  private syncActiveConversations(conversations: ConversationSummary[]): void {
    const activeUserId = this.activeClientUserId();
    if (activeUserId) {
      const clientConversation = conversations.find((conversation) => conversation.userId === activeUserId);
      if (clientConversation) {
        this.loadConversationMessages(clientConversation.id, 'client');
      }
    }

    const supportConversationId = this.activeSupportConversationId();
    if (supportConversationId && conversations.some((item) => item.id === supportConversationId)) {
      this.loadConversationMessages(supportConversationId, 'support');
      return;
    }

    if (conversations.length > 0) {
      const fallbackConversation = conversations[0];
      this.activeSupportConversationId.set(fallbackConversation.id);
      this.loadConversationMessages(fallbackConversation.id, 'support');
    } else {
      this.supportMessages.set([]);
    }
  }

  private loadConversationMessages(conversationId: string, panel: 'client' | 'support'): void {
    this.api
      .listMessages(conversationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          const orderedMessages = [...messages].sort((left, right) =>
            left.sentAt.localeCompare(right.sentAt)
          );
          if (panel === 'client') {
            this.clientMessages.set(orderedMessages);
          } else {
            this.supportMessages.set(orderedMessages);
          }
        }
      });
  }

  private subscribeToConversationSummaries(): void {
    this.socket
      .conversationUpdates$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((summary) => {
        const next = [...this.conversations().filter((conversation) => conversation.id !== summary.id), summary];
        next.sort((left, right) => {
          const leftKey = left.lastMessageAt ?? left.createdAt;
          const rightKey = right.lastMessageAt ?? right.createdAt;
          return rightKey.localeCompare(leftKey);
        });
        this.conversations.set(next);
      });
  }

  private subscribeToMessages(): void {
    this.socket
      .messages$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (message.conversationId === this.activeClientConversation()?.id) {
          this.clientMessages.update((messages) => this.appendMessage(messages, message));
        }
        if (message.conversationId === this.activeSupportConversation()?.id) {
          this.supportMessages.update((messages) => this.appendMessage(messages, message));
        }
      });
  }

  private appendMessage(messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
    if (messages.some((message) => message.id === incoming.id)) {
      return messages;
    }
    return [...messages, incoming].sort((left, right) => left.sentAt.localeCompare(right.sentAt));
  }

  private handleCreatedUser(response: CreateDemoUserResponse): void {
    const user: DemoUser = {
      id: response.id,
      displayName: response.displayName,
      createdAt: response.createdAt
    };

    this.users.update((users) => [...users, user]);
    this.activeClientUserId.set(user.id);
    this.clientMessages.set([]);

    const newConversation: ConversationSummary = {
      id: response.conversationId,
      userId: response.id,
      userDisplayName: response.displayName,
      createdAt: response.createdAt,
      lastMessageAt: null,
      lastMessagePreview: null
    };

    this.conversations.update((conversations) => [newConversation, ...conversations]);
    if (!this.activeSupportConversationId()) {
      this.activeSupportConversationId.set(response.conversationId);
      this.supportMessages.set([]);
    }
    this.isCreatingUser.set(false);
  }
}
