import { getDefaultTemplate } from '@/templates'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function Page(): React.ReactElement {
  const defaultTex = getDefaultTemplate()
  return <DashboardShell initialTex={defaultTex} />
}
