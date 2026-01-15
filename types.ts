import React from 'react';

export enum ArchiveStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  REVIEW_NEEDED = '待人工校验',
  APPROVED = '已归档',
  REJECTED = '已驳回',
  PENDING_APPROVAL = '待审批' // For deletion/sensitive actions
}

export enum ArchiveCategory {
  ACADEMIC = '学籍档案',
  PERSONNEL = '人事档案',
  RESEARCH = '科研档案',
  ADMINISTRATIVE = '行政档案',
  MEETING_MINUTES = '会议纪要',
  MEDIA = '多媒体档案',
  MANUSCRIPT = '手稿',
  TEXTBOOK = '教材',
  NEWS = '新闻稿',
  UNKNOWN = '未分类'
}

export enum SecurityLevel {
  PUBLIC = '公开',
  INTERNAL = '内部',
  CONFIDENTIAL = '机密',
  TOP_SECRET = '绝密'
}

export interface KnowledgeEntity {
  id: string;
  name: string;
  type: 'Person' | 'Location' | 'Organization' | 'Event' | 'Concept';
  context: string; // The sentence or timestamp where this appears (Positioning)
  confidence: number;
}

export interface ArchiveMetadata {
  title: string;
  category: ArchiveCategory;
  date: string; // ISO string
  authors: string[];
  department: string;
  summary: string;
  keywords: string[];
  securityLevel: SecurityLevel;
  confidenceScore: number; // 0-100
  textContent?: string; // Full text extraction
  fileProperties?: { // Format parsing details
    pageCount?: number;
    duration?: string; // For audio/video
    language?: string;
    originalFormat?: string;
  };
}

export interface ArchiveDocument {
  id: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  fileSize: number;
  status: ArchiveStatus;
  metadata?: ArchiveMetadata;
  entities?: KnowledgeEntity[]; // Extracted knowledge
  contentBase64?: string;
  uploadedBy?: string; // User ID
  path?: string; // Relative path/folder structure e.g. "2023_Scans/"
}

export enum UserRole {
  ADMIN = '管理员',
  USER = '普通用户'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  permissions: {
    canView: boolean;
    canImport: boolean;
    canExport: boolean;
    canModify: boolean;
    canDelete: boolean;
    requiresApproval: boolean;
  };
}

export interface StatMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}