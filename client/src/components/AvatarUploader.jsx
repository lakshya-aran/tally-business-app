import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import { ProgressBar } from './ui/Feedback';
import { uploadFile, validateFile, isFirebaseConfigured } from '../firebase/storageService';

/**
 * Picks an image, uploads it to Firebase Storage with progress, then calls
 * onUploaded({ url, path }). The API saves the reference and removes the old file.
 */
export default function AvatarUploader({ user, onUploaded, onRemove, busy }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const error = validateFile(file, 'avatar');
    if (error) return toast.error(error);

    setProgress(0);
    try {
      const uploaded = await uploadFile(file, { kind: 'avatar', user, onProgress: setProgress });
      await onUploaded({ url: uploaded.url, path: uploaded.path });
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress !== null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <Avatar name={user.name} src={user.avatar?.url} size="lg" />
      <div className="w-full max-w-xs space-y-2 text-center sm:text-left">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={!isFirebaseConfigured || busy}
            loading={uploading}
          >
            <Camera className="h-4 w-4" />
            {user.avatar?.url ? 'Change photo' : 'Upload photo'}
          </Button>
          {user.avatar?.url && (
            <Button variant="ghost" size="sm" onClick={onRemove} disabled={uploading || busy}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        {uploading ? (
          <ProgressBar value={progress} />
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isFirebaseConfigured ? 'JPG, PNG or WebP, up to 2 MB.' : 'Uploads are disabled until Firebase is configured.'}
          </p>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
      </div>
    </div>
  );
}
