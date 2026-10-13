import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useCreateList } from '../../data/mutations'
import { useBreakpoint } from '../../lib/useBreakpoint'
import { OCCASION_THEMES } from '../../lib/theme'
import { TYPE_LABEL, type ListType } from '../../types'
import { BottomBar, Button, Field, IconButton, PageHeader, Screen, ScreenBody, TextInput, toast } from '../../ui'
import './owner.css'

const SHORT_LABEL: Record<ListType, string> = { christmas: 'Noël', birthday: 'Anniv.', other: 'Autre' }
const TYPES = Object.keys(TYPE_LABEL) as ListType[]

export function NewList() {
  const nav = useNavigate()
  const create = useCreateList()
  const bp = useBreakpoint()
  const [type, setType] = useState<ListType>('christmas')
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate({ title, type, eventDate }, {
      onSuccess: (listId) => nav(`/lists/${listId}`, { replace: true }),
      onError: () => toast.error('Impossible de créer la liste. Réessaie.'),
    })
  }

  return (
    <Screen>
      {bp !== 'mobile' && <PageHeader crumbs={[{ label: 'Mes listes', to: '/app' }, { label: 'Nouvelle liste' }]} />}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className={bp === 'mobile' ? 'top-bar' : 'top-bar top-bar--shell'}>
          <IconButton label="Fermer" onClick={() => nav(-1)}><X size={22} /></IconButton>
          <div className="top-bar__center"><strong>Nouvelle liste</strong></div>
          <div className="top-bar__side" />
        </div>
        <ScreenBody gap={20}>
          <fieldset className="occasion-picker">
            <legend>Pour quelle occasion ?</legend>
            <div className="occasion-picker__grid">
              {TYPES.map((t) => (
                <label key={t} className="occasion-option">
                  <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
                  <span className="occasion-option__band" style={OCCASION_THEMES[t].header} />
                  <span className="occasion-option__label"><span className="occasion-option__dot" />{SHORT_LABEL[t]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Nom de la liste">
            <TextInput required maxLength={80} placeholder="Noël 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Date (facultatif)" hint="Pour afficher le compte à rebours à tes invités.">
            <TextInput type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
        </ScreenBody>
        <BottomBar stacked plain note={<span className="hand">tu pourras tout changer plus tard</span>}>
          <Button type="submit" large full loading={create.isPending}>Créer la liste</Button>
        </BottomBar>
      </form>
    </Screen>
  )
}
