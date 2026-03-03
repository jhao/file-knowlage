import React, { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UploadZone from './components/UploadZone';
import VerificationView from './components/VerificationView';
import ArchiveList from './components/ArchiveList';
import UserManagement from './components/UserManagement';
import SystemSettings from './components/SystemSettings';
import FileDetailView from './components/FileDetailView';
import MyUploadsView from './components/MyUploadsView';
import LoginView from './components/LoginView';
import { login as loginApi, getCurrentUser, type AuthUser } from './services/authApi';
import { approveArchive, createUpload, listArchives, rejectArchive, updateArchive } from './services/archiveApi';
import { ArchiveDocument, ArchiveStatus, UserRole } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const refreshArchives = async () => {
    try {
      const items = await listArchives();
      setDocuments(items);
    } catch (error) {
      console.error('加载档案失败', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    getCurrentUser(token)
      .then((user) => {
        setAuthUser(user);
        setUserRole(user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
      });
  }, []);

  useEffect(() => {
    if (!authUser) return;
    refreshArchives();
  }, [authUser]);

  const handleLogin = async (username: string, password: string) => {
    setIsLoginSubmitting(true);
    setLoginError('');
    try {
      const result = await loginApi(username, password);
      localStorage.setItem('auth_token', result.accessToken);
      setAuthUser(result.user);
      setUserRole(result.user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setAuthUser(null);
    setDocuments([]);
  };

  const handleUpload = async (files: File[]) => {
    try {
      const uploaded = await Promise.all(files.map((file) => createUpload(file)));
      setDocuments((prev) => [...uploaded, ...prev]);
      setCurrentView('verification');
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败');
    }
  };

  const updateDocument = async (id: string, updates: Partial<ArchiveDocument>) => {
    try {
      if (updates.status === ArchiveStatus.APPROVED) {
        const item = await approveArchive(id);
        setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...item, ...updates } : doc)));
        return;
      }
      if (updates.status === ArchiveStatus.REJECTED) {
        const item = await rejectArchive(id);
        setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...item, ...updates } : doc)));
        return;
      }

      const item = await updateArchive(id, updates);
      setDocuments((prev) => prev.map((doc) => (doc.id === id ? item : doc)));
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新失败');
    }
  };

  const handleViewDocument = (doc: ArchiveDocument) => {
    setSelectedDocumentId(doc.id);
    setCurrentView('file-detail');
  };

  const myDocuments = useMemo(
    () => documents.filter((d) => String(d.uploadedBy) === String(authUser?.id)),
    [documents, authUser?.id],
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard documents={documents} />;
      case 'upload':
        return <UploadZone onUpload={handleUpload} />;
      case 'verification':
        return <VerificationView documents={documents} onUpdateDocument={updateDocument} currentUserRole={userRole} />;
      case 'repository':
        return <ArchiveList documents={documents} onViewDocument={handleViewDocument} />;
      case 'my-uploads':
        return <MyUploadsView documents={myDocuments} onViewDocument={handleViewDocument} />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <SystemSettings />;
      case 'file-detail': {
        const selectedDoc = documents.find((d) => d.id === selectedDocumentId);
        if (!selectedDoc) return <ArchiveList documents={documents} onViewDocument={handleViewDocument} />;
        return (
          <FileDetailView
            document={selectedDoc}
            onBack={() => setCurrentView('repository')}
            onUpdateDocument={updateDocument}
            currentUserRole={userRole}
          />
        );
      }
      default:
        return <Dashboard documents={documents} />;
    }
  };

  const reviewCount = documents.filter((d) => d.status === ArchiveStatus.REVIEW_NEEDED || d.status === ArchiveStatus.PROCESSING).length;

  if (!authUser) {
    return <LoginView onSubmit={handleLogin} isSubmitting={isLoginSubmitting} errorMessage={loginError} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header userName={authUser.displayName} userDepartment={authUser.department} onLogout={handleLogout} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          reviewCount={reviewCount}
          currentUserRole={userRole}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">{renderView()}</main>
      </div>
    </div>
  );
};

export default App;
