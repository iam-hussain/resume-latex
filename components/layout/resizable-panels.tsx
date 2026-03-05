'use client'

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

interface ResizablePanelsProps {
  left: React.ReactNode
  right: React.ReactNode
  leftMinSize?: number
  rightMinSize?: number
}

export function ResizablePanels({
  left,
  right,
  leftMinSize = 20,
  rightMinSize = 20,
}: ResizablePanelsProps): React.ReactElement {
  return (
    <PanelGroup direction="horizontal" className="h-full w-full">
      <Panel defaultSize={50} minSize={leftMinSize} className="flex flex-col min-h-0">
        {left}
      </Panel>
      <PanelResizeHandle className="w-2 bg-border hover:bg-primary/20 transition-colors data-[resize-handle-active]:bg-primary/40" />
      <Panel defaultSize={50} minSize={rightMinSize} className="flex flex-col min-h-0">
        {right}
      </Panel>
    </PanelGroup>
  )
}
