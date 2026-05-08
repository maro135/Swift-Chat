import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { handleImageProcess } from './imageHandler';
import { toast } from 'sonner';

interface ImageUploadProps {
  value: string;
  onChange: (base64: string) => void;
  className?: string;
  placeholder?: string;
}

export function ImageUpload({ value, onChange, className = '', placeholder = "Choose image" }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const base64 = await handleImageProcess(file, 250);
      onChange(base64);
    } catch (err) {
      console.error(err);
      toast.error("Error processing image.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors overflow-hidden flex-shrink-0"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : value ? (
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <Camera size={20} className="text-gray-400" />
        )}
      </div>
      <div className="flex-1">
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors font-medium border border-white/5"
        >
          {value ? 'Change Image' : placeholder}
        </button>
        {value && (
          <button 
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] text-red-400 ml-3 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
}
