import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { ChatMessage, ConversationSummary, SendMessageCommand } from './chat.models';

@Injectable()
export class ChatSocketService {
  private readonly messageStream = new Subject<ChatMessage>();
  private readonly conversationStream = new Subject<ConversationSummary>();
  private readonly subscriptions = new Map<string, StompSubscription>();
  private readonly pendingConversationIds = new Set<string>();

  private readonly client = new Client({
    brokerURL: 'ws://localhost:8080/ws-chat',
    reconnectDelay: 2000
  });

  connect(): void {
    if (this.client.active) {
      return;
    }

    this.client.onConnect = () => {
      this.client.subscribe('/topic/conversations', (frame) => {
        this.conversationStream.next(JSON.parse(frame.body) as ConversationSummary);
      });
      for (const conversationId of this.pendingConversationIds) {
        this.subscribeToConversation(conversationId);
      }
    };
    this.client.activate();
  }

  sendMessage(command: SendMessageCommand): void {
    this.watchConversation(command.conversationId);
    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(command)
    });
  }

  conversationUpdates$(): Observable<ConversationSummary> {
    return this.conversationStream.asObservable();
  }

  messages$(): Observable<ChatMessage> {
    return this.messageStream.asObservable();
  }

  watchConversation(conversationId: string): void {
    this.pendingConversationIds.add(conversationId);
    if (!this.client.connected) {
      return;
    }
    this.subscribeToConversation(conversationId);
  }

  private subscribeToConversation(conversationId: string): void {
    if (this.subscriptions.has(conversationId)) {
      return;
    }
    const subscription = this.client.subscribe(
      `/topic/conversations.${conversationId}`,
      (frame: IMessage) => {
        this.messageStream.next(JSON.parse(frame.body) as ChatMessage);
      }
    );
    this.subscriptions.set(conversationId, subscription);
  }
}
