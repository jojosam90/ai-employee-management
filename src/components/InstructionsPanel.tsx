import { useRef, useState } from 'react'
import { Terminal, SendHorizonal } from 'lucide-react'
import { useSim } from '@/engine/store'
import { Panel } from './ui'
import { cn } from '@/lib/cn'

const SUGGESTIONS = [
  'Prioritise all invoices',
  'Prioritise receipts',
  'Pause Agent Beta',
  'Reallocate resources',
  'Generate the summary',
]

export default function InstructionsPanel() {
  const send = useSim((s) => s.sendInstruction)
  const phase = useSim((s) => s.phase)
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    if (!text.trim()) return
    send(text)
    setText('')
  }

  const applySuggestion = (s: string) => {
    setText(s)
    ref.current?.focus()
  }

  return (
    <Panel title="Give Instructions" icon={<Terminal size={14} />} className="shrink-0" bodyClass="p-3 space-y-2">
      <p className="text-[0.82rem] text-dim">
        {phase === 'standby'
          ? 'The team is waiting. Send an instruction — e.g. "prioritise all invoices" — to start processing.'
          : 'Direct the team in plain language — reprioritise the queue, pause an agent, focus a vendor, or ask for the summary.'}
      </p>
      <div className={cn('rounded-lg border bg-bg-2/70 p-2', phase === 'standby' ? 'border-amber/40' : 'border-edge-soft')}>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          rows={2}
          placeholder="Type a command…  (⌘/Ctrl + Enter to send)"
          className="w-full resize-none bg-transparent text-[0.9rem] text-txt placeholder:text-faint focus:outline-none"
        />
        <div className="mt-1 flex justify-end">
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 rounded-md bg-teal/15 px-2.5 py-1 text-[0.86rem] font-medium text-teal ring-1 ring-teal/30 transition hover:bg-teal/25 disabled:opacity-40"
          >
            Send <SendHorizonal size={12} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => applySuggestion(s)}
            className="rounded-full border border-edge-soft bg-white/[0.02] px-2 py-0.5 text-[0.8rem] text-dim transition hover:border-teal/40 hover:text-teal"
          >
            {s}
          </button>
        ))}
      </div>
    </Panel>
  )
}
