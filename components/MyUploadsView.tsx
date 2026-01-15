import React, { useState, useMemo } from 'react';
import { ArchiveDocument, ArchiveStatus } from '../types';
import { FileText, Calendar, ChevronLeft, ChevronRight, Clock, HardDrive, File, Video, Music, Image as ImageIcon, AlertCircle, CheckCircle2, Folder } from 'lucide-react';

interface MyUploadsViewProps {
  documents: ArchiveDocument[];
  onViewDocument: (doc: ArchiveDocument) => void;
}

const MyUploadsView: React.FC<MyUploadsViewProps> = ({ documents, onViewDocument }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');

  // Helper to extract extension
  const getFileExtension = (filename: string) => {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toUpperCase();
  };

  const getFileIcon = (type: string) => {
    if (type === 'folder') return <Folder size={16} className="text-blue-500 fill-blue-100" />;
    if (type.startsWith('video/')) return <Video size={16} className="text-pink-500"/>;
    if (type.startsWith('audio/')) return <Music size={16} className="text-purple-500"/>;
    if (type.startsWith('image/')) return <ImageIcon size={16} className="text-emerald-500"/>;
    return <FileText size={16} className="text-indigo-500"/>;
  };

  const getStatusBadge = (status: ArchiveStatus) => {
      switch(status) {
          case ArchiveStatus.APPROVED: return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100"><CheckCircle2 size={10}/> 已归档</span>;
          case ArchiveStatus.REVIEW_NEEDED: return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-100"><AlertCircle size={10}/> 待校验</span>;
          case ArchiveStatus.PROCESSING: return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-100"><Clock size={10}/> AI处理中</span>;
          default: return <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">{status}</span>;
      }
  };

  // Grouping Logic
  const timelineData = useMemo(() => {
    // Filter docs by current year
    const docsInYear = documents.filter(doc => {
        const d = new Date(doc.uploadDate);
        return d.getFullYear() === currentYear;
    });

    // Group by month
    const months: Record<number, number> = {};
    docsInYear.forEach(doc => {
        const m = new Date(doc.uploadDate).getMonth(); // 0-11
        months[m] = (months[m] || 0) + 1;
    });

    return { docsInYear, months };
  }, [documents, currentYear]);

  // Filter right side list
  const displayDocs = timelineData.docsInYear.filter(doc => {
      if (selectedMonth === 'ALL') return true;
      return new Date(doc.uploadDate).getMonth() === selectedMonth;
  }).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* --- LEFT SIDEBAR: TIMELINE --- */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <HardDrive size={18} className="text-indigo-600"/> 我上传的文件
            </h3>
        </div>

        {/* Year Navigator */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button 
                onClick={() => setCurrentYear(y => y - 1)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500"
            >
                <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-slate-800 text-lg tracking-widest">{currentYear}</span>
            <button 
                onClick={() => setCurrentYear(y => y + 1)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500"
                disabled={currentYear >= new Date().getFullYear() + 1}
            >
                <ChevronRight size={16} />
            </button>
        </div>
        
        {/* Month List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <button 
                onClick={() => setSelectedMonth('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedMonth === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <span className="flex items-center gap-2"><Calendar size={14}/> 全部月份</span>
                <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-500">{timelineData.docsInYear.length}</span>
            </button>
            
            <div className="border-t border-slate-100 my-2 mx-2"></div>
            
            {[...Array(12)].map((_, i) => {
                const monthIndex = 11 - i; // Reverse order (Dec -> Jan)
                const count = timelineData.months[monthIndex] || 0;
                
                // Hide future months for current year if count is 0
                if (count === 0 && currentYear === new Date().getFullYear() && monthIndex > new Date().getMonth()) return null;

                return (
                    <button 
                        key={monthIndex}
                        onClick={() => setSelectedMonth(monthIndex)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedMonth === monthIndex ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'} ${count === 0 ? 'opacity-50' : ''}`}
                    >
                        <span>{monthIndex + 1}月</span>
                        {count > 0 && (
                            <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-500">{count}</span>
                        )}
                    </button>
                );
            })}
        </div>
      </div>

      {/* --- RIGHT MAIN: FILE LIST --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
             <div>
                <h2 className="text-lg font-bold text-slate-800">
                    {selectedMonth === 'ALL' ? `${currentYear}年全部上传` : `${currentYear}年 ${selectedMonth + 1}月`}
                </h2>
                <p className="text-xs text-slate-500">共 {displayDocs.length} 个文件/文件夹</p>
             </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-hidden p-6 relative">
            <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">名称</th>
                                <th className="px-6 py-4">大小</th>
                                <th className="px-6 py-4">上传时间</th>
                                <th className="px-6 py-4">状态</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayDocs.map((doc) => (
                                <tr 
                                    key={doc.id} 
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    onClick={() => doc.fileType !== 'folder' && onViewDocument(doc)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-100 p-2 rounded text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                {getFileIcon(doc.fileType)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium transition-colors ${doc.fileType === 'folder' ? 'text-blue-700' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                                                        {doc.fileName}
                                                    </span>
                                                    {/* EXTENSION BADGE: Hide for folders */}
                                                    {doc.fileType !== 'folder' && (
                                                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1 rounded border border-slate-300">
                                                            {getFileExtension(doc.fileName)}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* PATH DISPLAY */}
                                                {doc.path && (
                                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <Folder size={10}/> /{doc.path}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        {doc.fileType === 'folder' ? '-' : `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB`}
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                        {new Date(doc.uploadDate).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(doc.status)}
                                    </td>
                                </tr>
                            ))}
                            {displayDocs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <File size={32} className="opacity-20"/>
                                            <p>此时间段内没有上传记录</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MyUploadsView;