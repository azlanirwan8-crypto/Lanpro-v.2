export interface DiscussionPoint {
  id?: string;
  meetingId?: string;
  parentPointId?: string;
  parent_point_id?: string;
  parentpointid?: string;
  authorId?: string;
  assignTo?: string;
  assignee_id?: string;
  concern: string;
  comment?: string;
  fitur?: string;
  feature_id?: string;
  system?: string;
  system_id?: string;
  surrounding?: string;
  surrounding_id?: string;
  keterangan?: string;
  next_action?: string;
  tindakanLanjut?: string;
  tindakan_lanjut?: string;
  status: 'pending' | 'completed';
  targetDate?: string;
  target_date?: string;
  tanggalUpdateStatus?: string;
  createdAt?: any;
  commentsCount?: number;
}

export interface DiscussionPointComment {
  id: string;
  pointId: string;
  userId?: string;
  userName?: string;
  user_name?: string;
  commentText: string;
  comment_text?: string;
  createdAt: string;
  created_at?: string;
}

export interface Meeting {
  id?: string;
  projectId: string;
  title: string;
  description?: string;
  meetingLink?: string;
  authorId: string; // The user who created the meeting
  createdAt: any;
  updatedAt?: any;
  transcript?: string;
  aiSummary?: string | any;
  recording_url?: string;
  file_size?: number;
  upload_status?: string;
  fileData?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}
