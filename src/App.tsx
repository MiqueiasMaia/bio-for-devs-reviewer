import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { isEnvConfigured } from '@/lib/env'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ProjectsDashboardPage } from '@/features/projects/ProjectsDashboardPage'
import { ProjectLayout } from '@/features/projects/ProjectLayout'
import { ProjectOverviewPage } from '@/features/projects/ProjectOverviewPage'
import { ProjectSettingsLayout } from '@/features/projects/settings/ProjectSettingsLayout'
import { GeneralTab } from '@/features/projects/settings/GeneralTab'
import { CriteriaTab } from '@/features/projects/settings/CriteriaTab'
import { PicotsTab } from '@/features/projects/settings/PicotsTab'
import { ExclusionReasonsTab } from '@/features/projects/settings/ExclusionReasonsTab'
import { MembersTab } from '@/features/projects/settings/MembersTab'
import { AiSetupPage } from '@/features/aiSetup/AiSetupPage'
import { ImportWizardPage } from '@/features/imports/ImportWizardPage'
import { DedupReviewPage } from '@/features/imports/DedupReviewPage'
import { ScreeningWorkspacePage } from '@/features/screening/ScreeningWorkspacePage'
import { ConflictsPage } from '@/features/conflicts/ConflictsPage'
import { PrismaPage } from '@/features/prisma/PrismaPage'
import { RiskOfBiasPage } from '@/features/riskOfBias/RiskOfBiasPage'
import { DataExtractionPage } from '@/features/dataExtraction/DataExtractionPage'
import { ExtractionConflictsPage } from '@/features/dataExtraction/ExtractionConflictsPage'
import { ExtractionFieldsTab } from '@/features/projects/settings/ExtractionFieldsTab'
import { AiProviderTab } from '@/features/projects/settings/AiProviderTab'
import { AiAuditPage } from '@/features/aiAudit/AiAuditPage'
import { EnvSetupNotice } from '@/components/EnvSetupNotice'
import { AppShell } from '@/components/AppShell'

function App() {
  if (!isEnvConfigured) {
    return <EnvSetupNotice />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/projects" element={<ProjectsDashboardPage />} />
              <Route path="/projects/:projectId" element={<ProjectLayout />}>
                <Route index element={<ProjectOverviewPage />} />
                <Route path="import" element={<ImportWizardPage />} />
                <Route path="duplicates" element={<DedupReviewPage />} />
                <Route
                  path="screening/title-abstract"
                  element={<ScreeningWorkspacePage key="title_abstract" stage="title_abstract" />}
                />
                <Route
                  path="screening/full-text"
                  element={<ScreeningWorkspacePage key="full_text" stage="full_text" />}
                />
                <Route path="conflicts" element={<ConflictsPage />} />
                <Route path="risk-of-bias" element={<RiskOfBiasPage />} />
                <Route path="data-extraction" element={<DataExtractionPage />} />
                <Route path="data-extraction/conflicts" element={<ExtractionConflictsPage />} />
                <Route path="ai-audit" element={<AiAuditPage />} />
                <Route path="prisma" element={<PrismaPage />} />
                <Route path="settings" element={<ProjectSettingsLayout />}>
                  <Route index element={<Navigate to="general" replace />} />
                  <Route path="general" element={<GeneralTab />} />
                  <Route path="import" element={<ImportWizardPage />} />
                  <Route path="criteria" element={<CriteriaTab />} />
                  <Route path="picots" element={<PicotsTab />} />
                  <Route path="exclusion-reasons" element={<ExclusionReasonsTab />} />
                  <Route path="extraction-fields" element={<ExtractionFieldsTab />} />
                  <Route path="members" element={<MembersTab />} />
                  <Route path="ai-setup" element={<AiSetupPage />} />
                  <Route path="ai-provider" element={<AiProviderTab />} />
                </Route>
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
