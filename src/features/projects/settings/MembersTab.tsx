import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useInvites, useMemberMutations, useMembers } from './hooks'
import type { ProjectRole } from '@/types/domain'

const ROLES: ProjectRole[] = ['owner', 'reviewer', 'viewer']

export function MembersTab() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { data: members } = useMembers(project.id)
  const { data: invites } = useInvites(project.id)
  const mutations = useMemberMutations(project.id)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('reviewer')

  function handleInvite(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !user) return
    mutations.invite.mutate(
      { email: email.trim(), role, invitedBy: user.id },
      { onSuccess: () => setEmail('') },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('members.title')}</h2>
        <p className="text-sm text-mut">{t('members.subtitle')}</p>
      </div>

      <Card>
        {members?.map((member) => (
          <div key={member.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
            <div className="flex-1">
              <p className="text-sm font-medium text-fg">
                {member.displayName || member.email}{' '}
                {member.userId === user?.id && <span className="text-mut">{t('members.you')}</span>}
              </p>
              <p className="text-xs text-mut">{member.email}</p>
            </div>
            <Select
              label=""
              aria-label={t('members.role')}
              className="w-32"
              value={member.role}
              onChange={(e) =>
                mutations.updateRole.mutate({ memberId: member.id, role: e.target.value as ProjectRole })
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`projects.role_${r}`)}
                </option>
              ))}
            </Select>
            <Button
              variant="ghost"
              aria-label={t('common.delete')}
              onClick={() => {
                if (confirm(t('members.removeConfirm'))) mutations.remove.mutate(member.id)
              }}
            >
              ✕
            </Button>
          </div>
        ))}

        {invites?.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
            <div className="flex-1">
              <p className="text-sm font-medium text-fg">{invite.email}</p>
              <p className="text-xs text-mut">
                {t('members.pending')} · {t(`projects.role_${invite.role}`)}
              </p>
            </div>
            <Button variant="ghost" aria-label={t('common.delete')} onClick={() => mutations.cancelInvite.mutate(invite.id)}>
              ✕
            </Button>
          </div>
        ))}

        <form onSubmit={handleInvite} className="mt-4 flex items-end gap-2">
          <TextField
            label={t('members.invite')}
            type="email"
            placeholder={t('members.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select label={t('members.role')} value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`projects.role_${r}`)}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={!email.trim()}>
            {t('common.add')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
