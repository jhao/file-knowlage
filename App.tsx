import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UploadZone from './components/UploadZone';
import VerificationView from './components/VerificationView';
import ArchiveList from './components/ArchiveList';
import UserManagement from './components/UserManagement';
import SystemSettings from './components/SystemSettings';
import FileDetailView from './components/FileDetailView';
import MyUploadsView from './components/MyUploadsView'; // Imported new component
import { ArchiveDocument, ArchiveStatus, ArchiveCategory, SecurityLevel, UserRole } from './types';
import { parseDocumentWithGemini } from './services/geminiService';

// Mock current user ID
const CURRENT_USER_ID = 'u1';

// --- RICH MOCK DATA FOR DEMONSTRATION ---
const INITIAL_DOCS: ArchiveDocument[] = [
  // --- EXISTING DATA (Mapped to CURRENT_USER_ID) ---
  {
    id: 'vid-001',
    fileName: '2023_AI_Conference_Keynote.mp4',
    fileType: 'video/mp4',
    uploadDate: '2023-11-10T09:00:00Z',
    fileSize: 450000000,
    status: ArchiveStatus.REVIEW_NEEDED, 
    uploadedBy: CURRENT_USER_ID,
    contentBase64: '', 
    metadata: {
        title: "2023年人工智能创新大会主旨演讲",
        category: ArchiveCategory.MEDIA,
        date: "2023-11-01",
        authors: ["王院长", "陈院士"],
        department: "计算机科学与技术学院",
        summary: "王院长关于大模型在教育领域应用的演讲视频录像。",
        keywords: ["人工智能", "大模型", "教育改革"],
        securityLevel: SecurityLevel.PUBLIC,
        confidenceScore: 92,
        fileProperties: { duration: '45:20', language: '中文' },
        textContent: "[00:00:15] 王院长：各位老师、同学，大家好..."
    },
    entities: [
        { id: 'e1', name: '王院长', type: 'Person', context: '主讲人', confidence: 100 },
        { id: 'e2', name: '人工智能创新大会', type: 'Event', context: '会议名称', confidence: 98 }
    ]
  },
  {
    id: 'aud-002',
    fileName: 'Oral_History_Prof_Li_1980s.mp3',
    fileType: 'audio/mpeg',
    uploadDate: '2023-11-11T14:30:00Z',
    fileSize: 15000000,
    status: ArchiveStatus.REVIEW_NEEDED,
    uploadedBy: CURRENT_USER_ID,
    metadata: {
        title: "口述校史：李教授回忆80年代的老校区",
        category: ArchiveCategory.MEDIA,
        date: "2023-10-15",
        authors: ["李建国(受访)"],
        department: "档案馆",
        summary: "李建国教授关于1980年代学校西迁历史...",
        keywords: ["口述历史", "西迁"],
        securityLevel: SecurityLevel.INTERNAL,
        confidenceScore: 88,
        fileProperties: { duration: '22:15', language: '中文' },
        textContent: "记者：李教授，您能谈谈82年..."
    }
  },
  
  // --- NEW MOCK DATA: 2024 FOLDERS & FILES ---
  // 1. A Folder (Visual Representation)
  {
    id: 'fld-2024-001',
    fileName: '2024_Dept_Audit_Materials',
    fileType: 'folder', // Special type for folder
    uploadDate: '2024-05-15T10:00:00Z',
    fileSize: 0,
    status: ArchiveStatus.UPLOADED,
    uploadedBy: CURRENT_USER_ID
  },
  // 2. Files inside that folder
  {
    id: 'doc-2024-001-a',
    fileName: 'Audit_Report_Q1.pdf',
    fileType: 'application/pdf',
    uploadDate: '2024-05-15T10:01:00Z',
    fileSize: 2500000,
    status: ArchiveStatus.PROCESSING,
    uploadedBy: CURRENT_USER_ID,
    path: '2024_Dept_Audit_Materials/'
  },
  {
    id: 'doc-2024-001-b',
    fileName: 'Financial_Statements.xlsx',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadDate: '2024-05-15T10:01:05Z',
    fileSize: 45000,
    status: ArchiveStatus.REVIEW_NEEDED,
    uploadedBy: CURRENT_USER_ID,
    path: '2024_Dept_Audit_Materials/'
  },

  // 3. Individual recent files
  {
    id: 'img-2024-002',
    fileName: 'Campus_Spring_Festival.jpg',
    fileType: 'image/jpeg',
    uploadDate: '2024-04-10T14:20:00Z',
    fileSize: 3200000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    metadata: {
        title: "2024校园春日文化节",
        category: ArchiveCategory.MEDIA,
        date: "2024-04-10",
        authors: ["学生会"],
        department: "团委",
        summary: "樱花季校园文化节活动现场照片。",
        keywords: ["春日", "文化节"],
        securityLevel: SecurityLevel.PUBLIC,
        confidenceScore: 95
    }
  },

  // --- NEW MOCK DATA: 2023 ARCHIVE SCANS (Simulating a large batch) ---
  {
    id: 'fld-2023-old',
    fileName: 'Old_Library_Blueprints_1960',
    fileType: 'folder',
    uploadDate: '2023-10-05T09:00:00Z',
    fileSize: 0,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID
  },
  {
    id: 'scan-001',
    fileName: 'Scan_Floor_1.tiff',
    fileType: 'image/tiff',
    uploadDate: '2023-10-05T09:05:00Z',
    fileSize: 12000000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    path: 'Old_Library_Blueprints_1960/'
  },
  {
    id: 'scan-002',
    fileName: 'Scan_Floor_2.tiff',
    fileType: 'image/tiff',
    uploadDate: '2023-10-05T09:06:00Z',
    fileSize: 12500000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    path: 'Old_Library_Blueprints_1960/'
  },
  {
    id: 'scan-doc-003',
    fileName: 'Architect_Notes.txt',
    fileType: 'text/plain',
    uploadDate: '2023-10-05T09:07:00Z',
    fileSize: 5000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    path: 'Old_Library_Blueprints_1960/'
  },

  // Other user's data (Should not appear in My Uploads)
  {
    id: 'man-003',
    fileName: '1952_Founding_President_Letter.jpg',
    fileType: 'image/jpeg',
    uploadDate: '2023-11-12T10:00:00Z',
    fileSize: 2100000,
    status: ArchiveStatus.REVIEW_NEEDED, 
    uploadedBy: 'u2', // OTHER USER
    contentBase64: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    metadata: {
        title: "1952年首任校长关于院系调整的手写信函",
        category: ArchiveCategory.MANUSCRIPT,
        date: "1952-06-10",
        authors: ["赵元任(拟)"],
        department: "校史馆",
        summary: "首任校长致教育部建议信...",
        keywords: ["手稿"],
        securityLevel: SecurityLevel.TOP_SECRET,
        confidenceScore: 95
    }
  },
  
  // Mixed files
  {
    id: 'aca-004',
    fileName: 'Student_Transcript_2019_ZhangSan.pdf',
    fileType: 'application/pdf',
    uploadDate: '2023-11-12T11:00:00Z',
    fileSize: 512000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    metadata: {
        title: "2019级本科生张三学籍表",
        category: ArchiveCategory.ACADEMIC,
        date: "2023-06-30",
        authors: ["教务处"],
        department: "教务处",
        summary: "张三成绩单...",
        keywords: ["成绩单"],
        securityLevel: SecurityLevel.CONFIDENTIAL,
        confidenceScore: 99
    }
  },
  {
    id: 'new-006',
    fileName: 'Press_Release_Science_Award_2023.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadDate: '2023-11-13T15:00:00Z',
    fileSize: 24000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    metadata: {
        title: "我校物理系团队荣获国家自然科学二等奖",
        category: ArchiveCategory.NEWS,
        date: "2023-10-01",
        authors: ["宣传部"],
        department: "物理系",
        summary: "获奖新闻稿...",
        keywords: ["获奖", "新闻"],
        securityLevel: SecurityLevel.PUBLIC,
        confidenceScore: 96
    }
  },
  {
    id: 'off-007',
    fileName: 'Admin_Notice_2024_Labor_Day.pdf',
    fileType: 'application/pdf',
    uploadDate: '2024-04-20T08:00:00Z',
    fileSize: 120000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    metadata: {
        title: "关于2024年劳动节放假安排的通知",
        category: ArchiveCategory.ADMINISTRATIVE,
        date: "2024-04-15",
        authors: ["校长办公室"],
        department: "校办",
        summary: "放假通知...",
        keywords: ["通知"],
        securityLevel: SecurityLevel.PUBLIC,
        confidenceScore: 99
    }
  },
  {
    id: 'tex-009',
    fileName: 'Intro_to_Data_Science_Ch1.pdf',
    fileType: 'application/pdf',
    uploadDate: '2023-09-01T08:00:00Z',
    fileSize: 8500000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    metadata: {
        title: "《数据科学导论》第一章",
        category: ArchiveCategory.TEXTBOOK,
        date: "2023-08-01",
        authors: ["教材编写组"],
        department: "教务处",
        summary: "教材样章...",
        keywords: ["教材"],
        securityLevel: SecurityLevel.INTERNAL,
        confidenceScore: 91
    }
  },
  {
    id: 'exc-010',
    fileName: '2024_Research_Budget_Allocation.xlsx',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadDate: '2024-01-10T11:00:00Z',
    fileSize: 45000,
    status: ArchiveStatus.APPROVED,
    uploadedBy: CURRENT_USER_ID,
    metadata: {
        title: "2024年度科研经费预算分配表",
        category: ArchiveCategory.ADMINISTRATIVE,
        date: "2024-01-05",
        authors: ["财务处"],
        department: "财务处",
        summary: "经费预算表...",
        keywords: ["预算"],
        securityLevel: SecurityLevel.CONFIDENTIAL,
        confidenceScore: 99
    }
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [documents, setDocuments] = useState<ArchiveDocument[]>(INITIAL_DOCS);
  
  // State for Detail View
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Simple Mock Auth State
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);

  // Helper to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (files: File[]) => {
    // 1. Create Document entries immediately
    const newDocs: ArchiveDocument[] = await Promise.all(files.map(async (f) => {
        const base64 = await readFileAsBase64(f);
        return {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fileName: f.name,
            fileType: f.type,
            fileSize: f.size,
            uploadDate: new Date().toISOString(),
            status: ArchiveStatus.PROCESSING, // Start as processing
            contentBase64: base64,
            uploadedBy: CURRENT_USER_ID // Set uploader
        };
    }));

    setDocuments(prev => [...prev, ...newDocs]);
    setCurrentView('verification'); // Auto switch to verify to show processing status

    // 2. Trigger AI processing for each
    newDocs.forEach(async (doc) => {
        try {
            if (doc.contentBase64) {
                 const result = await parseDocumentWithGemini(
                     doc.contentBase64.split(',')[1], 
                     doc.fileType
                 );
                 
                 setDocuments(prev => prev.map(d => 
                    d.id === doc.id 
                    ? { ...d, status: ArchiveStatus.REVIEW_NEEDED, metadata: result.metadata, entities: result.entities } 
                    : d
                 ));
            }
        } catch (e) {
            console.error("Auto-process failed", e);
             setDocuments(prev => prev.map(d => 
                d.id === doc.id 
                ? { ...d, status: ArchiveStatus.REVIEW_NEEDED } // Still needs review even if failed
                : d
             ));
        }
    });
  };

  const updateDocument = (id: string, updates: Partial<ArchiveDocument>) => {
      setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
  };

  // Switch to detail view when clicking a document in lists
  const handleViewDocument = (doc: ArchiveDocument) => {
      setSelectedDocumentId(doc.id);
      setCurrentView('file-detail');
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard documents={documents} />;
      case 'upload': return <UploadZone onUpload={handleUpload} />;
      case 'verification': return <VerificationView documents={documents} onUpdateDocument={updateDocument} currentUserRole={userRole} />;
      case 'repository': return <ArchiveList documents={documents} onViewDocument={handleViewDocument} />;
      case 'my-uploads': 
          // Filter only my uploads AND use the new View component
          return <MyUploadsView documents={documents.filter(d => d.uploadedBy === CURRENT_USER_ID)} onViewDocument={handleViewDocument} />;
      case 'users': return <UserManagement />;
      case 'settings': return <SystemSettings />;
      case 'file-detail':
          const selectedDoc = documents.find(d => d.id === selectedDocumentId);
          if (!selectedDoc) return <ArchiveList documents={documents} onViewDocument={handleViewDocument}/>;
          return (
              <FileDetailView 
                  document={selectedDoc} 
                  onBack={() => setCurrentView('repository')} // Default back to repo, or track previous view if needed
                  onUpdateDocument={updateDocument}
                  currentUserRole={userRole}
              />
          );
      default: return <Dashboard documents={documents} />;
    }
  };

  const reviewCount = documents.filter(d => d.status === ArchiveStatus.REVIEW_NEEDED || d.status === ArchiveStatus.PROCESSING).length;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header />
      {/* Role Switcher Demo Control (Floating) */}
      <div className="fixed bottom-4 right-4 z-50 bg-white shadow-lg border border-slate-200 p-2 rounded-lg text-xs opacity-75 hover:opacity-100 transition-opacity">
          <p className="mb-1 font-bold text-slate-500">演示模式: 当前角色</p>
          <select 
              value={userRole} 
              onChange={e => setUserRole(e.target.value as UserRole)}
              className="bg-slate-100 rounded px-2 py-1 outline-none"
          >
              <option value={UserRole.ADMIN}>系统管理员</option>
              <option value={UserRole.USER}>普通用户</option>
          </select>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          currentView={currentView} 
          onNavigate={setCurrentView} 
          reviewCount={reviewCount}
          currentUserRole={userRole}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;