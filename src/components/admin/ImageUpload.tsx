import * as React from 'react';
import { Upload, Loader2, X, ImageIcon, Link2 } from 'lucide-react';
import { uploadImage, type UploadFolder } from '../../services/storageService';
import { TextInput } from './AdminModal';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: UploadFolder;
  label?: string;
  hint?: string;
  shape?: 'square' | 'wide';
}

export function ImageUpload({ value, onChange, folder, hint, shape = 'wide' }: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadImage(file, folder);
      onChange(url);
    } catch (e: any) {
      setError(e?.message || 'Upload thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const aspect = shape === 'square' ? 'aspect-square w-32 h-32' : 'aspect-video';

  return (
    <div className="space-y-3">
      {value ? (
        <div className="space-y-3">
          <div className={`relative ${aspect} rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800`}>
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all backdrop-blur"
              title="Xoá ảnh"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Đổi ảnh
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(v => !v)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest"
              title="Dán URL"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          className={`${aspect} rounded-2xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 bg-zinc-950 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group`}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Đang tải lên...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest">Bấm để chọn ảnh</p>
                <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest mt-1">hoặc kéo thả vào đây · jpg/png/webp · tối đa 5mb</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSelectFile}
      />

      {(showUrlInput || (!value && !uploading)) && (
        <div className="space-y-1">
          <TextInput
            type="url"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Hoặc dán URL ảnh: https://..."
          />
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-400 font-bold">{error}</p>
      )}

      {hint && !error && (
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{hint}</p>
      )}
    </div>
  );
}
