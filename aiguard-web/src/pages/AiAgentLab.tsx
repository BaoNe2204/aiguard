import React from 'react';
import { FlaskConical, PauseCircle, Route, ShieldAlert } from 'lucide-react';
import { Agents } from './Agents';

export const AiAgentLab: React.FC = () => {
  return (
    <div className="ai-agent-lab-page">
      <div className="card glass p-5 mb-5 border border-amber-500/20 bg-amber-500/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center justify-center">
              <FlaskConical size={20} />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold m-0">AI Agent Lab</h1>
              <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
                AI Agent Control Tower đang tạm tắt khỏi menu vận hành chính. Trang này dùng riêng để phát triển, test permission,
                tool-call interceptor, prompt injection, runtime control và red-team trước khi bật lại cho khách hàng.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/70 text-amber-200 border border-amber-500/20 text-xs font-semibold">
            <PauseCircle size={14} /> Dev only
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg border border-zinc-700/70 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Route size={15} /> Route tạm</div>
            <p className="text-xs text-zinc-400 mt-1">/app/dev/ai-agent-lab</p>
          </div>
          <div className="rounded-lg border border-zinc-700/70 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldAlert size={15} /> Chưa bật production</div>
            <p className="text-xs text-zinc-400 mt-1">Không hiện trong menu chủ doanh nghiệp.</p>
          </div>
          <div className="rounded-lg border border-zinc-700/70 bg-zinc-950/50 p-3">
            <div className="text-sm font-semibold text-white">Mục tiêu test</div>
            <p className="text-xs text-zinc-400 mt-1">Allow, PendingApproval, Block, audit log và runtime kill switch.</p>
          </div>
        </div>
      </div>

      <Agents />
    </div>
  );
};

export default AiAgentLab;
