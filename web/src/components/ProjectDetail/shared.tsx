import { type ReactNode, type MouseEventHandler } from 'react';
import { Loader2, CheckCircle, Save } from 'lucide-react';

export const Field = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <div className="input-group">
    <label className="input-label">{label}</label>{children}
  </div>
);

interface SaveButtonProps {
  loading: boolean;
  saved: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export const SaveButton = ({ loading, saved, onClick }: SaveButtonProps) => (
  <button className={`btn btn-${saved ? 'success' : 'primary'} mt-3`} onClick={onClick} disabled={loading}>
    {loading ? <><Loader2 size={16} className="spin" /> Saving…</> :
     saved   ? <><CheckCircle size={16} /> Saved</> :
               <><Save size={16} /> Save Details</>}
  </button>
);
