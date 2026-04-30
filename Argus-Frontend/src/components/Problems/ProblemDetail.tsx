import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProblem, useUpdateProblem } from '../../hooks/useProblems';
import ProblemServiceNowPanel from '../ITSMTemplates/ProblemServiceNowPanel';
import { SNPage, sn } from '../ITSMTemplates/ServiceNowUI';

export default function ProblemDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProblem(id);
  const updateProblem = useUpdateProblem();
  const problem = data?.data;

  if (isLoading) {
    return (
      <SNPage className="flex min-h-[360px] items-center justify-center gap-3" style={{ margin: '-24px', background: '#fff' }}>
        <Loader2 className="animate-spin" size={20} />
        Loading problem...
      </SNPage>
    );
  }

  if (isError || !problem) {
    return (
      <SNPage className="flex min-h-[360px] flex-col items-center justify-center gap-3" style={{ margin: '-24px', background: '#fff' }}>
        <div className="text-lg font-bold" style={{ color: sn.critical }}>Problem not found</div>
        <button type="button" className="sn-soft-button" onClick={() => navigate('/problems')}>Back to Problems</button>
      </SNPage>
    );
  }

  return (
    <SNPage className="min-h-full" style={{ margin: '-24px', padding: 24, background: sn.shellBg }}>
      <ProblemServiceNowPanel problem={problem} updateProblem={updateProblem} />
    </SNPage>
  );
}
