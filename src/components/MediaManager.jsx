import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import axios from 'axios';
import { Upload, X, Image, Video, Music, FileDigit, Trash2, ExternalLink } from 'lucide-react';
import Modal from './Modal';

const MediaManager = ({ attachedMedia, onAttach, onDetach, contextType = 'question' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('image');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  // Determine accepted file types based on selection
  const getAcceptString = () => {
    switch (uploadType) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      default: return '*/*';
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, label }) => {
      // Step 1: Get Presigned URL
      const initRes = await api.post('/media', {
        type,
        label: label || file.name
      });
      
      const { presignedUrl, id } = initRes.data;

      // Step 2: Upload to S3 (PUT)
      // Note: We use a raw axios call here to avoid the default API interceptors (Auth headers)
      // which might conflict with S3 presigned URLs if they are strict about headers.
      await axios.put(presignedUrl, file, {
        headers: {
            'Content-Type': file.type
        }
      });

      return { id };
    },
    onSuccess: (data) => {
        onAttach(data.id);
        setUploadFile(null);
        setUploadLabel('');
        setUploading(false);
        setIsModalOpen(false);
    },
    onError: (err) => {
        console.error(err);
        alert('Upload failed: ' + (err.response?.data?.message || err.message));
        setUploading(false);
    }
  });

  const handleUpload = (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    uploadMutation.mutate({ 
        file: uploadFile, 
        type: uploadType, 
        label: uploadLabel 
    });
  };

  const handleMediaClick = async (mediaId) => {
      try {
          const res = await api.get(`/media/${mediaId}/download`);
          if (res.data.presignedUrl) {
              window.open(res.data.presignedUrl, '_blank');
          } else {
              alert('Could not get download URL');
          }
      } catch (err) {
          console.error('Failed to get download URL', err);
          alert('Error opening media');
      }
  };

  const getIcon = (type) => {
      switch(type) {
          case 'image': return <Image size={20} />;
          case 'video': return <Video size={20} />;
          case 'audio': return <Music size={20} />;
          default: return <FileDigit size={20} />;
      }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-bold uppercase text-xs text-gray-500 tracking-wider">Attached Media</h5>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold border-2 border-neo-black px-2 py-1 hover:bg-neo-main hover:text-white transition-colors flex items-center gap-1"
        >
            <Upload size={12} /> Add Media
        </button>
      </div>

      {/* List Attached Media */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {attachedMedia?.map((media) => (
            <div 
                key={media.id} 
                className="relative group border-2 border-neo-black bg-neo-white p-2 flex flex-col items-center text-center cursor-pointer hover:shadow-neo-sm transition-all"
                onClick={(e) => {
                    // Don't trigger if clicking delete button
                    if (e.target.closest('.delete-btn')) return;
                    handleMediaClick(media.id);
                }}
                title="Click to open media in new tab"
            >
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDetach(media.id);
                    }}
                    className="delete-btn absolute top-1 right-1 p-1 bg-neo-error text-white border-2 border-neo-black opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove Media"
                >
                    <X size={12} />
                </button>
                
                <div className="mb-2 h-24 w-full flex items-center justify-center bg-gray-100 overflow-hidden relative">
                    {/* We try to use the direct URL for preview if available, otherwise fall back to icon */}
                    {media.type === 'image' && media.url ? (
                        <img 
                            src={media.url} 
                            alt={media.label} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex'; // Show fallback
                            }}
                        />
                    ) : null}
                    
                    <div className="text-gray-400 flex w-full h-full items-center justify-center absolute top-0 left-0 bg-gray-100" style={{ display: (media.type === 'image' && media.url) ? 'none' : 'flex' }}>
                        {getIcon(media.type)}
                    </div>
                    
                    {/* Overlay icon to indicate clickable */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                         <ExternalLink size={20} className="text-neo-white drop-shadow-md" />
                    </div>
                </div>
                <span className="text-xs font-bold truncate w-full block" title={media.label}>{media.label}</span>
                <span className="text-[10px] uppercase text-gray-500">{media.type}</span>
            </div>
        ))}
        
        {(!attachedMedia || attachedMedia.length === 0) && (
            <div className="col-span-full py-2 text-center text-xs text-gray-400 italic border-2 border-dashed border-gray-300">
                No media attached
            </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add Media to ${contextType}`}>
        <form onSubmit={handleUpload} className="space-y-4">
            <div>
                <label className="block font-bold mb-2">Media Type</label>
                <div className="flex gap-2">
                    {['image', 'video', 'audio', 'interactive'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setUploadType(t)}
                            className={`px-3 py-1 border-2 border-neo-black text-sm font-bold uppercase transition-all ${
                                uploadType === t ? 'bg-neo-main shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-neo-white hover:bg-neo-bg'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block font-bold mb-2">Select File</label>
                <input 
                    type="file" 
                    accept={getAcceptString()}
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="neo-input" 
                    required
                />
            </div>

            <div>
                <label className="block font-bold mb-2">Label (Optional)</label>
                <input 
                    type="text" 
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    className="neo-input"
                    placeholder="e.g., Figure 1"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="neo-btn-secondary">Cancel</button>
                <button type="submit" className="neo-btn" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload & Attach'}
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default MediaManager;
