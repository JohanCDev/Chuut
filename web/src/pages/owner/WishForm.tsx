import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Info, Pencil, Trash2, X } from 'lucide-react'
import { useDeleteWish, useFetchLinkMeta, useSaveWish } from '../../data/mutations'
import { useWish } from '../../data/queries'
import type { Priority, Wish } from '../../types'
import {
  BottomBar, Button, ButtonLink, ConfirmDialog, EmptyState, Field, IconButton, Screen, ScreenBody, Spinner, TextInput, toast, WishFallback,
} from '../../ui'
import './owner.css'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'bof', label: 'Bof' },
  { value: 'jaime', label: "J'aime" },
  { value: 'coeur', label: 'Coup de cœur' },
]

const parsePrice = (s: string) => {
  const n = Number(s.trim().replace(',', '.'))
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : null
}

type LookupState = 'idle' | 'loading' | 'done' | 'failed'

export function WishForm({ mode }: { mode: 'new' | 'edit' }) {
  const { listId, wishId } = useParams()
  const wish = useWish(listId, mode === 'edit' ? wishId : undefined)

  if (mode === 'edit') {
    if (wish.isPending) return <Spinner page />
    if (!wish.data) {
      return (
        <Screen>
          <ScreenBody>
            <EmptyState title="Ce souhait est introuvable" action={<ButtonLink to={`/lists/${listId}`} variant="outline">Retour à la liste</ButtonLink>} />
          </ScreenBody>
        </Screen>
      )
    }
  }
  return <WishFields key={wishId ?? 'new'} listId={listId!} wishId={mode === 'edit' ? wishId : undefined} initial={wish.data ?? null} />
}

function WishFields({ listId, wishId, initial }: { listId: string; wishId?: string; initial: Wish | null }) {
  const nav = useNavigate()
  const save = useSaveWish(listId)
  const remove = useDeleteWish(listId)
  const lookup = useFetchLinkMeta()
  const editing = !!wishId
  const fileInput = useRef<HTMLInputElement>(null)

  const [url, setUrl] = useState(initial?.url ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price).replace('.', ',') : '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'jaime')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [domain, setDomain] = useState(initial?.domain ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [found, setFound] = useState('')
  const [lookedUp, setLookedUp] = useState(initial?.url ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const fetchMeta = async (raw: string) => {
    const link = raw.trim()
    if (!/^https?:\/\/\S+$/i.test(link) || link === lookedUp) return
    setLookedUp(link)
    setLookupState('loading')
    try {
      const meta = await lookup.mutateAsync(link)
      setTitle((t) => t || meta.title || '')
      setPrice((p) => p || (meta.price != null ? String(meta.price).replace('.', ',') : ''))
      setImageUrl((i) => i || meta.imageUrl || '')
      setDomain(meta.domain)
      const got = [meta.title && 'titre', meta.price != null && 'prix', meta.imageUrl && 'image'].filter(Boolean) as string[]
      setFound(got.length ? `${got.join(', ').replace(/, ([^,]*)$/, ' et $1')} récupéré${got.length > 1 ? 's' : ''}` : '')
      setLookupState(got.length ? 'done' : 'failed')
    } catch {
      setLookupState('failed')
    }
  }

  const onUrlChange = (value: string) => {
    setUrl(value)
    setLookupState('idle')
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (text) void fetchMeta(text)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      onUrlChange(text.trim())
      await fetchMeta(text)
    } catch {
      toast.error('Colle le lien directement dans le champ.')
    }
  }

  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    if (picked.size > MAX_IMAGE_BYTES) return toast.error('Image trop lourde (2 Mo maximum).')
    setFile(picked)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { wishId, input: { title, url, domain, price: parsePrice(price), imageUrl, note, priority, file } },
      {
        onSuccess: () => nav(`/lists/${listId}`, { replace: true }),
        onError: () => toast.error("Enregistrement impossible. Vérifie l'image (2 Mo max) et réessaie."),
      },
    )
  }

  const shownImage = preview || imageUrl
  const noteChanged = editing && note !== (initial?.note ?? '')

  return (
    <Screen>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="top-bar">
          <IconButton label="Fermer" onClick={() => nav(`/lists/${listId}`)}><X size={22} /></IconButton>
          <div className="top-bar__center"><strong>{editing ? 'Modifier le souhait' : 'Nouveau souhait'}</strong></div>
          <div className="top-bar__side" />
        </div>
        <ScreenBody gap={20}>
          <div className="wish-form__top">
            <button type="button" className="wish-form__image" onClick={() => fileInput.current?.click()} aria-label="Choisir une image">
              {shownImage ? <img src={shownImage} alt="" /> : <WishFallback title={title || 'cadeau'} />}
              <span className="wish-form__image-edit"><Pencil size={14} aria-hidden="true" /></span>
            </button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            <Field label="Titre">
              <TextInput required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </div>

          <div className="field">
            <span className="field__label">Lien</span>
            <div className="wish-form__link">
              <TextInput
                type="url" inputMode="url" aria-label="Lien" placeholder="https://" value={url}
                onChange={(e) => onUrlChange(e.target.value)} onPaste={onPaste} onBlur={() => void fetchMeta(url)}
              />
              {!editing && <Button variant="secondary" large onClick={() => void pasteFromClipboard()}>Coller</Button>}
            </div>
            <div className="field__hint" role="status" aria-live="polite">
              {lookupState === 'loading' && 'Recherche du lien…'}
              {lookupState === 'done' && <span className="wish-form__ok"><Check size={16} aria-hidden="true" />{found.charAt(0).toUpperCase() + found.slice(1)}</span>}
              {lookupState === 'failed' && "Impossible de lire ce lien. Remplis les champs à la main."}
            </div>
          </div>

          <div className="wish-form__pair">
            <Field label="Prix">
              <TextInput inputMode="decimal" placeholder="€" aria-label="Prix" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Petit mot">
              <TextInput
                className={noteChanged ? 'input--changed wish-form__note' : 'wish-form__note'}
                maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>

          <fieldset className="priority-picker">
            <legend>Envie</legend>
            <div className="priority-picker__grid">
              {PRIORITIES.map((p) => (
                <label key={p.value} className="priority-option">
                  <input type="radio" name="priority" value={p.value} checked={priority === p.value} onChange={() => setPriority(p.value)} />
                  <span><span className="priority-option__dot" aria-hidden="true" />{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {editing && (
            <div className="hint-banner">
              <Info size={20} aria-hidden="true" style={{ flex: 'none' }} />
              <div className="hint-banner__text">Tes invités verront que ce souhait a changé, pour ne pas acheter la mauvaise taille ou couleur.</div>
            </div>
          )}
        </ScreenBody>
        <BottomBar stacked plain>
          {editing && (
            <Button variant="ghost" className="wish-form__delete" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} aria-hidden="true" />Supprimer ce souhait
            </Button>
          )}
          <Button type="submit" large full loading={save.isPending}>{editing ? 'Enregistrer' : 'Ajouter à ma liste'}</Button>
        </BottomBar>
      </form>

      {editing && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Supprimer « ${initial?.title} » ?`}
          description="Il disparaîtra de ta liste. Si quelqu'un avait prévu de l'offrir, il sera prévenu à sa prochaine visite."
          confirmLabel="Supprimer"
          cancelLabel="Garder"
          loading={remove.isPending}
          onConfirm={() => remove.mutateAsync(wishId!).then(
            () => nav(`/lists/${listId}`, { replace: true }),
            () => toast.error('Suppression impossible. Réessaie.'),
          )}
        />
      )}
    </Screen>
  )
}
