import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FileScan, FileBarChart, Download } from 'lucide-react'
import { useSim } from '@/engine/store'
import { Panel } from './ui'
import { exportPdf } from '@/lib/reportPdf'
import { cn } from '@/lib/cn'
import type { Report } from '@/types'

export default function WorkSurface() {
  const report = useSim((s) => s.report)
  const config = useSim((s) => s.config)
  const [tab, setTab] = useState<'detail' | 'report'>('detail')
  const autoSwitched = useRef(false)

  useEffect(() => {
    if (report && !autoSwitched.current) {
      setTab('report')
      autoSwitched.current = true
    }
  }, [report])

  const Detail = config.DetailView
  const ReportBody = config.ReportView
  const financeReport = config.id === 'finance' ? (report?.data as Report | undefined) : undefined

  return (
    <Panel
      title="Agent Workspace"
      icon={<FileScan size={14} />}
      className="xl:min-h-0 xl:flex-1"
      bodyClass="p-0 flex flex-col min-h-0"
    >
      <div className="flex items-center gap-1 border-b border-edge-soft px-2 py-1.5">
        <TabBtn active={tab === 'detail'} onClick={() => setTab('detail')} icon={<FileScan size={13} />}>
          {config.labels.detailTab}
        </TabBtn>
        <TabBtn
          active={tab === 'report'}
          onClick={() => report && setTab('report')}
          icon={<FileBarChart size={13} />}
          disabled={!report}
        >
          {config.labels.reportTab}
        </TabBtn>
        {financeReport && (
          <button
            onClick={() => void exportPdf(financeReport)}
            className="ml-auto flex items-center gap-1 rounded-md bg-bg-2 px-2 py-1 text-[0.82rem] text-dim ring-1 ring-edge-soft hover:text-txt"
          >
            <Download size={12} /> PDF
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1">{tab === 'detail' ? <Detail /> : <ReportBody />}</div>
    </Panel>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.85rem] font-medium transition',
        active ? 'bg-cyan/15 text-cyan ring-1 ring-cyan/30' : 'text-dim hover:text-txt',
        disabled && 'cursor-not-allowed opacity-40 hover:text-dim',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
