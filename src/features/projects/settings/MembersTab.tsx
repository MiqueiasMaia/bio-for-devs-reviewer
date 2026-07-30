import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { PlusIcon } from '@/components/ui/icons'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useInvites, useMemberMutations, useMembers } from './hooks'
import type { ProjectRole } from '@/types/domain'

const ROLES: ProjectRole[] = ['owner', 'reviewer', 'viewer']

/** Single-action "..." menu — this app only has one destructive action per
 * row (remove member / cancel invite), unlike Rayyan's Revoke+Delete pair,
 * so it's one item rather than a fabricated second option. */
function RowActionsMenu({ label, onAction }: { label: string; onAction: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        className="cursor-pointer rounded-full px-2 py-1 text-mut hover:bg-bg"
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 border border-line bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-red-700 hover:bg-bg"
            onClick={() => {
              setOpen(false)
              onAction()
            }}
          >
            {label}
          </button>
        </div>
      )}
    </div>
  )
}

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

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg text-left text-xs font-semibold text-mut">
              <th className="px-4 py-3 font-semibold">{t('members.name')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.email')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.role')}</th>
              <th className="px-4 py-3 font-semibold">{t('members.status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members?.map((member) => {
              const isOwner = member.role === 'owner'
              return (
                <tr key={member.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar seed={member.userId} initials={member.initials} />
                      <span className="font-medium text-fg">
                        {member.displayName || member.email}
                        {member.userId === user?.id && <span className="ml-1 text-mut">{t('members.you')}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-mut">{member.email}</td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <span className="font-medium text-fg">{t('projects.role_owner')}</span>
                    ) : (
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
                    )}
                  </td>
                  <td className="px-4 py-3 text-include">{t('members.active')}</td>
                  <td className="px-4 py-3 text-right">
                    {!isOwner && (
                      <RowActionsMenu
                        label={t('members.removeMember')}
                        onAction={() => {
                          if (confirm(t('members.removeConfirm'))) mutations.remove.mutate(member.id)
                        }}
                      />
                    )}
                  </td>
                </tr>
              )
            })}

            {invites?.map((invite) => (
              <tr key={invite.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar seed={invite.email} initials={invite.email.slice(0, 2).toUpperCase()} />
                    <span className="font-medium text-fg">{invite.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-mut">{invite.email}</td>
                <td className="px-4 py-3 text-fg">{t(`projects.role_${invite.role}`)}</td>
                <td className="px-4 py-3 text-uncertain">{t('members.pending')}</td>
                <td className="px-4 py-3 text-right">
                  <RowActionsMenu
                    label={t('members.cancelInvite')}
                    onAction={() => mutations.cancelInvite.mutate(invite.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <form onSubmit={handleInvite} className="flex items-end gap-2">
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
          <IconButton icon={<PlusIcon />} label={t('common.add')} type="submit" disabled={!email.trim()} />
        </form>
      </Card>
    </div>
  )
}
