import { Outlet, useOutletContext } from 'react-router-dom'
import type { ProjectOutletContext } from '../ProjectLayout'

export function ProjectSettingsLayout() {
  const context = useOutletContext<ProjectOutletContext>()
  return <Outlet context={context} />
}
