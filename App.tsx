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
import SystemLogsView from './components/SystemLogsView';
import BackendJobsView from './components/BackendJobsView';
import { login as loginApi, getCurrentUser, changePassword, type AuthUser } from './services/authApi';
import { approveArchiveWithComment, createUpload, listArchives, rejectArchive, updateArchive } from './services/archiveApi';
import { sha256Hex } from './services/crypto';
import { getDashboardStats, type DashboardStatsResponse } from './services/statsApi';
import { ArchiveDocument, ArchiveStatus, UserRole } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardStatsResponse | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const refreshArchives = async () => {
    try {
      const items = await listArchives();
      setDocuments(items);
    } catch (error) {
      console.error('加载档案失败', error);
    }
  };

  const refreshDashboard = async () => {
    try {
      setDashboard(await getDashboardStats());
    } catch (error) {
      console.error('加载概览失败', error);
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
    refreshDashboard();
  }, [authUser]);

  const handleLogin = async (username: string, password: string) => {
    setIsLoginSubmitting(true);
    setLoginError('');
    try {
      const passwordDigest = await sha256Hex(password);
      const result = await loginApi(username, passwordDigest);
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
      await refreshDashboard();
      setCurrentView('verification');
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败');
    }
  };

  const updateDocument = async (id: string, updates: Partial<ArchiveDocument>) => {
    try {
      if (updates.status === ArchiveStatus.APPROVED) {
        const approvalComment = String((updates as any).approvalComment || '').trim();
        const result = await approveArchiveWithComment(id, approvalComment);
        const item = result.item;
        setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...item, ...updates } : doc)));
        await refreshDashboard();
        return;
      }
      if (updates.status === ArchiveStatus.REJECTED) {
        const item = await rejectArchive(id);
        setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...item, ...updates } : doc)));
        await refreshDashboard();
        return;
      }

      const item = await updateArchive(id, updates);
      setDocuments((prev) => prev.map((doc) => (doc.id === id ? item : doc)));
      await refreshDashboard();
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新失败');
    }
  };

  const handleViewDocument = (doc: ArchiveDocument) => {
    setSelectedDocumentId(doc.id);
    setCurrentView('file-detail');
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    if (view === 'jobs') {
      setFocusTaskId(null);
    }
  };

  const myDocuments = useMemo(
    () => documents.filter((d) => String(d.uploadedBy) === String(authUser?.id)),
    [documents, authUser?.id],
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard data={dashboard} />;
      case 'upload':
        return <UploadZone onUpload={handleUpload} />;
      case 'verification':
        return <VerificationView documents={documents} onUpdateDocument={updateDocument} onRefreshDocuments={refreshArchives} onOpenJobDetail={(taskId) => { setFocusTaskId(taskId); setCurrentView('jobs'); }} currentUserRole={userRole} currentUserId={authUser.id} />;
      case 'jobs':
        return <BackendJobsView focusTaskId={focusTaskId} />;
      case 'repository':
        return <ArchiveList documents={documents} onViewDocument={handleViewDocument} />;
      case 'my-uploads':
        return <MyUploadsView documents={myDocuments} onViewDocument={handleViewDocument} />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return userRole === UserRole.ADMIN ? <SystemSettings /> : <Dashboard data={dashboard} />;
      case 'logs':
        return <SystemLogsView />;
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
        return <Dashboard data={dashboard} />;
    }
  };



  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      alert('请输入旧密码和新密码');
      return;
    }
    try {
      setPasswordSubmitting(true);
      const oldDigest = await sha256Hex(oldPassword);
      const newDigest = await sha256Hex(newPassword);
      await changePassword(oldDigest, newDigest);
      alert('密码修改成功，请使用新密码登录');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
    } catch (error) {
      alert(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const reviewCount = documents.filter((d) => d.status === ArchiveStatus.REVIEW_NEEDED || d.status === ArchiveStatus.PROCESSING).length;

  if (!authUser) {
    return <LoginView onSubmit={handleLogin} isSubmitting={isLoginSubmitting} errorMessage={loginError} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header userName={authUser.displayName} userDepartment={authUser.department} onLogout={handleLogout} onOpenChangePassword={() => setShowChangePassword(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          reviewCount={reviewCount}
          currentUserRole={userRole}
          storageUsedBytes={dashboard?.metrics.storageUsedBytes || 0}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">{renderView()}</main>
      </div>
      {showChangePassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">修改密码</h3>
            <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="请输入旧密码" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="请输入新密码" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 border border-slate-300 rounded" onClick={() => setShowChangePassword(false)}>取消</button>
              <button className="px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-50" disabled={passwordSubmitting} onClick={handleChangePassword}>{passwordSubmitting ? '提交中...' : '确认修改'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
