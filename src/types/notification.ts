export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  title: string;
  message: string;
  type: string;
  relatedId?: string;
  read: boolean;
  createdAt: any;
}
