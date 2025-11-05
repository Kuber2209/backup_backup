

export type UserRole = 'SPT' | 'JPT' | 'Associate';
export type AssignableRole = 'JPT' | 'Associate';
export type AnnouncementAudience = 'all' | 'jpt-only';
export type UserStatus = 'pending' | 'active' | 'declined';

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  isOnHoliday?: boolean;
  status?: UserStatus;
  notificationTokens?: string[];
}

export interface VoiceNote {
  id: string;
  url: string; // URL to the audio file in Firebase Storage
  transcript?: string; // Optional transcript
  createdAt: string; // ISO string
  createdBy: string; // User ID
}

export interface Message {
  id:string;
  userId: string;
  text: string;
  createdAt: string; // ISO string
  voiceNote?: VoiceNote;
  replyTo?: {
    messageId: string;
    text: string;
    userName: string;
  }
}

export interface Document {
    id: string;
    name: string;
    url: string; // In a real app, this would be a Firebase Storage URL
    uploadedBy: string;
    createdAt: string; // ISO string
}

export interface ResourceComment {
    id: string;
    userId: string;
    text: string;
    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
}

export interface Resource {
    id: string;
    title: string;
    description: string;
    link?: {
        name: string;
        url: string;
    };
    document?: {
        name: string;
        url: string;
    };
    createdBy: string; // User ID
    createdAt: string; // ISO string
    comments?: ResourceComment[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string; // ISO string
  documents?: Document[];
  audience?: AnnouncementAudience;
  voiceNoteUrl?: string;
  isPinned?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: 'Open' | 'In Progress' | 'Completed';
  createdBy: string; // userId of JPT or SPT
  assignableTo: AssignableRole[]; // Roles that can be assigned this task
  assignedTo: string[]; // Array of user IDs
  requiredAssociates?: number;
  requiredJpts?: number;
  createdAt: string; // ISO string
  deadline?: string; // ISO string
  completedAt?: string; // ISO string
  messages?: Message[];
  documents?: Document[];
  isAnonymous?: boolean;
  voiceNoteUrl?: string;
}
