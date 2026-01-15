import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, AlertCircle, Video, Music, Image as ImageIcon, FolderPlus } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const processUpload = () => {
    onUpload(selectedFiles);
    setSelectedFiles([]);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <Video size={20} />;
    if (type.startsWith('audio/')) return <Music size={20} />;
    if (type.startsWith('image/')) return <ImageIcon size={20} />;
    return <File size={20} />;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">多源数据导入</h2>
        <p className="text-slate-500">支持音频、视频、手稿、学籍档案、照片、文书及电子文档。</p>
      </div>

      <div className="flex gap-4">
          <div 
            className={`flex-1 border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-white ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mp3,.wav"
            />
            <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-4">
              <UploadCloud size={48} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">上传单个文件</h3>
            <p className="text-slate-500 mt-2 text-center text-sm">
              点击或拖拽文件至此
            </p>
          </div>

          <div 
            className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-white hover:border-indigo-400 hover:bg-slate-50"
            onClick={() => folderInputRef.current?.click()}
          >
             {/* Using a little hack for webkitdirectory using standard React input attributes is tricky, using plain input props spread */}
             <input
                type="file"
                ref={folderInputRef}
                className="hidden"
                onChange={handleFileSelect}
                {...{webkitdirectory: "", directory: ""} as any} 
             />
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 mb-4">
              <FolderPlus size={48} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">上传文件夹</h3>
            <p className="text-slate-500 mt-2 text-center text-sm">
              批量导入目录下的所有文件
            </p>
          </div>
      </div>
      
      <p className="text-xs text-slate-400 text-center">支持格式: PDF, Word, Excel, JPG, MP4, MP3 (最大 200MB)</p>

      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h4 className="font-semibold text-slate-700">准备导入 ({selectedFiles.length})</h4>
            <button 
              onClick={processUpload}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              开始 AI 处理
            </button>
          </div>
          <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
            {selectedFiles.map((file, idx) => (
              <li key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded text-slate-500">
                    {getFileIcon(file.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown Type'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
        <div>
          <h5 className="text-sm font-semibold text-blue-800">格式解析与数据安全</h5>
          <p className="text-xs text-blue-600 mt-1">
            系统会对上传的音频/视频自动提取字幕文本。所有上传的原图将添加防爬取水印，禁止未授权下载。
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;