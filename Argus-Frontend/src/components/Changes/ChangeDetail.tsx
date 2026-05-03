import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApproveChange, useChange, useUpdateChange } from '../../hooks/useChanges';
import ChangeServiceNowPanel from '../ITSMTemplates/ChangeServiceNowPanel';
import { SNPage, sn } from '../ITSMTemplates/ServiceNowUI';

export default function ChangeDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useChange(id);
  const updateChange = useUpdateChange();
  const approveChange = useApproveChange();
  const change = data?.data;

  if (isLoading) {
    return (
      <SNPage className="flex min-h-[360px] items-center justify-center gap-3" style={{ margin: '-24px', background: '#fff' }}>
        <Loader2 className="animate-spin" size={20} />
        Loading change...
      </SNPage>
    );
  }

  if (isError || !change) {
    return (
      <SNPage className="flex min-h-[360px] flex-col items-center justify-center gap-3" style={{ margin: '-24px', background: '#fff' }}>
        <div className="text-lg font-bold" style={{ color: sn.critical }}>Change not found</div>
        <button type="button" className="sn-soft-button" onClick={() => navigate('/changes')}>Back to Changes</button>
      </SNPage>
    );
  }

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <ChangeServiceNowPanel
        change={change}
        updateChange={updateChange}
        approveLoading={approveChange.isPending}
        onApprove={async () => {
          try {
            await approveChange.mutateAsync({ id, state: 'APPROVED', comments: 'Approved from change form' });
            toast.success('Change approved');
          } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Approval failed');
          }
        }}
        onReject={async () => {
          try {
            await approveChange.mutateAsync({ id, state: 'REJECTED', comments: 'Rejected from change form' });
            toast.success('Change rejected');
          } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Rejection failed');
          }
        }}
      />
    </SNPage>
  );
}
