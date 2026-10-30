import { useState } from 'react';
import { sampleLeads } from '../data/seedData';
import { PIPELINE_STAGES, type Lead, type PipelineStage } from '../lib/types';

// Kanban over the top-scored sample leads so the board stays readable.
// Stage moves are local demo state in Phase 1; in production they
// write to leads.stage in Supabase (same six stage values, enforced
// by a CHECK constraint in the schema).

const BOARD_SIZE = 24;

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>(() => sampleLeads.slice(0, BOARD_SIZE));

  const move = (id: string, dir: 1 | -1) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== id) return lead;
        const idx = PIPELINE_STAGES.indexOf(lead.stage);
        const next = Math.min(PIPELINE_STAGES.length - 1, Math.max(0, idx + dir));
        return { ...lead, stage: PIPELINE_STAGES[next] as PipelineStage };
      }),
    );
  };

  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>
        Top {BOARD_SIZE} scored sample leads. Use ← → on a card to move it through
        New Lead → Attempted Contact → Conversation → Offer Made → Under Contract →
        Nurture/Dead. (Demo state — refresh resets.)
      </p>
      <div className="kanban">
        {PIPELINE_STAGES.map((stage) => {
          const inStage = leads.filter((l) => l.stage === stage);
          return (
            <div className="kcol" key={stage}>
              <h4>
                {stage} ({inStage.length})
              </h4>
              {inStage.map((lead) => (
                <div className="kcard" key={lead.id}>
                  <strong>{lead.address}</strong>
                  <div className="muted">
                    {lead.market} · score {lead.score}
                    {lead.saleDate ? ` · sale ${lead.saleDate}` : ''}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="ghost" onClick={() => move(lead.id, -1)}>
                      ← back
                    </button>
                    <button className="ghost" onClick={() => move(lead.id, 1)}>
                      forward →
                    </button>
                  </div>
                </div>
              ))}
              {inStage.length === 0 && <div className="small muted">Empty</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
