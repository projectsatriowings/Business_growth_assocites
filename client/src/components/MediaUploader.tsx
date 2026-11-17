import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Link as LinkIcon,
  X,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { uploadFile, UploadedFileResponse } from '../utils/api';
import { useToast } from '../context/ToastContext';

export interface MediaUploadResult {
  url: string;
  originalName: string;
  fileType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'ARCHIVE' | 'OTHER' | string;
  size?: number;
}

interface MediaUploaderProps {
  value?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  onChange: (result: MediaUploadResult | null) => void;
  label?: string;
  helperText?: string;
  allowUrlToggle?: boolean;
  required?: boolean;
  accept?: string;
  maxSizeMb?: number;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  value = '',
  fileType,
  fileName,
  fileSize,
  onChange,
  label = 'Media / Document Attachment',
  helperText = 'Upload screenshots, video demo, audio brief, document or zip archive (Max 100MB)',
  allowUrlToggle = true,
  required = false,
  accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.tar,.gz',
  maxSizeMb = 100,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isUrlMode, setIsUrlMode] = useState(Boolean(value && !value.startsWith('/uploads/')));
  const [customUrl, setCustomUrl] = useState(value && !value.startsWith('/uploads/') ? value : '');

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File is too large. Maximum allowed size is ${maxSizeMb}MB.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      onChange({
        url: uploaded.url,
        originalName: uploaded.originalName,
        fileType: uploaded.fileType,
        size: uploaded.size,
      });
      toast.success(`${uploaded.fileType.toLowerCase()} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleClear = () => {
    onChange(null);
    setCustomUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCustomUrlApply = () => {
    if (!customUrl.trim()) {
      handleClear();
      return;
    }
    const ext = customUrl.split('.').pop()?.toLowerCase() || '';
    let detectedType: string = 'OTHER';
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) detectedType = 'IMAGE';
    else if (['mp4', 'webm', 'mov', 'mkv'].includes(ext) || customUrl.includes('loom.com') || customUrl.includes('youtube.com')) detectedType = 'VIDEO';
    else if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) detectedType = 'AUDIO';
    else if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) detectedType = 'DOCUMENT';
    else if (['zip', 'rar', 'tar'].includes(ext)) detectedType = 'ARCHIVE';

    const guessedName = customUrl.split('/').pop()?.split('?')[0] || 'External Link Attachment';

    onChange({
      url: customUrl.trim(),
      originalName: guessedName,
      fileType: detectedType,
    });
  };

  const renderTypeIcon = (type?: string) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5 text-indigo-600" />;
      case 'VIDEO':
        return <Video className="w-5 h-5 text-rose-600" />;
      case 'AUDIO':
        return <Music className="w-5 h-5 text-purple-600" />;
      case 'ARCHIVE':
        return <Archive className="w-5 h-5 text-amber-600" />;
      default:
        return <FileText className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-1.5 text-xs">
      {/* Header and Toggle */}
      <div className="flex justify-between items-center">
        <label className="font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {allowUrlToggle && (
          <button
            type="button"
            onClick={() => {
              setIsUrlMode(!isUrlMode);
              if (isUrlMode && value && !value.startsWith('/uploads/')) {
                handleClear();
              }
            }}
            className="text-[11px] font-semibold text-[#3066BE] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {isUrlMode ? (
              <>
                <Upload className="w-3 h-3" /> Upload Local File
              </>
            ) : (
              <>
                <LinkIcon className="w-3 h-3" /> Or Paste Link
              </>
            )}
          </button>
        )}
      </div>

      {/* URL Input Mode */}
      {isUrlMode ? (
        <div className="space-y-1">
          <div className="relative">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
              }}
              onBlur={handleCustomUrlApply}
              placeholder="e.g. https://drive.google.com/... or https://loom.com/share/..."
              className="w-full p-2.5 pr-8 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#3066BE]/30 focus:border-[#3066BE] transition-all"
            />
            {customUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Paste Google Drive, Figma, Loom video, YouTube, or public staging link.
          </p>
        </div>
      ) : (
        /* File Upload Mode */
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* If file already uploaded, show rich attachment preview card */}
          {value ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Visual Thumbnail for Images or Icon for Others */}
                {fileType === 'IMAGE' || (value && value.match(/\.(png|jpg|jpeg|webp|svg|gif)$/i)) ? (
                  <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shrink-0 relative group">
                    <img
                      src={value}
                      alt={fileName || 'Attachment preview'}
                      className="w-full h-full object-cover"
                    />
                    <a
                      href={value}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Eye className="w-4 h-4 text-white" />
                    </a>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {renderTypeIcon(fileType)}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[280px]">
                      {fileName || value.split('/').pop() || 'Uploaded Attachment'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Uploaded
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                    {fileType && <span className="uppercase font-semibold text-indigo-600">{fileType}</span>}
                    {fileSize && <span>• {formatBytes(fileSize)}</span>}
                    <a
                      href={value}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3066BE] hover:underline flex items-center gap-0.5 font-sans font-semibold"
                    >
                      Preview <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Remove / Change Attachment */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Upload Drop Area */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#3066BE] bg-[#3066BE]/5 scale-[1.01]'
                  : 'border-slate-300 hover:border-[#3066BE]/60 hover:bg-slate-50/70 bg-white'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center py-2 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#3066BE]" />
                  <span className="text-xs font-bold text-slate-700">Uploading media to server...</span>
                  <span className="text-[10px] text-slate-400">Processing file and generating secure link</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-0.5">
                    <Upload className="w-5 h-5 text-[#3066BE]" />
                  </div>
                  <div>
                    <span className="font-bold text-[#3066BE] hover:underline">Click to browse file</span>
                    <span className="text-slate-500"> or drag and drop here</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap justify-center">
                    <span className="flex items-center gap-0.5"><ImageIcon className="w-3 h-3 text-indigo-500" /> Screenshot / Image</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Video className="w-3 h-3 text-rose-500" /> Video Demo</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Music className="w-3 h-3 text-purple-500" /> Audio Note</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><FileText className="w-3 h-3 text-blue-500" /> PDF / Document</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Max size: {maxSizeMb}MB</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {helperText && !value && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
};
