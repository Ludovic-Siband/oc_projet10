import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatMessage, ConversationSummary, CreateDemoUserResponse, DemoUser } from './chat.models';

@Injectable()
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = 'http://localhost:8080/api';

  createDemoUser(): Observable<CreateDemoUserResponse> {
    return this.http.post<CreateDemoUserResponse>(`${this.apiBaseUrl}/demo-users`, {});
  }

  listUsers(): Observable<DemoUser[]> {
    return this.http.get<DemoUser[]>(`${this.apiBaseUrl}/demo-users`);
  }

  listConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(`${this.apiBaseUrl}/conversations`);
  }

  listMessages(conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiBaseUrl}/conversations/${conversationId}/messages`);
  }
}
