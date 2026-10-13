import { Sheet } from './Sheet'

type Row = { label: string; keys: string[]; scope: 'both' | 'owner' | 'guest' }

/** Static reference, not derived from the bindings: keep in sync when a shortcut changes. */
const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Partout',
    rows: [
      { label: 'Rechercher', keys: ['/'], scope: 'both' },
      { label: 'Créer une liste', keys: ['N'], scope: 'owner' },
      { label: 'Fermer panneau ou dialogue', keys: ['Échap'], scope: 'both' },
      { label: 'Cette aide', keys: ['?'], scope: 'both' },
    ],
  },
  {
    title: 'Dans ma liste',
    rows: [
      { label: 'Ajouter un souhait', keys: ['A'], scope: 'owner' },
      { label: 'Partager', keys: ['S'], scope: 'owner' },
      { label: 'Souhait suivant / précédent', keys: ['J', 'K'], scope: 'owner' },
      { label: 'Modifier', keys: ['E'], scope: 'owner' },
      { label: 'Enregistrer le formulaire', keys: ['⌘', '↵'], scope: 'owner' },
    ],
  },
  {
    title: 'Invité',
    rows: [
      { label: 'Idée suivante / précédente', keys: ['J', 'K'], scope: 'guest' },
      { label: "Je m'en occupe", keys: ['R'], scope: 'guest' },
      { label: "J'ai acheté", keys: ['B'], scope: 'guest' },
    ],
  },
]

/** Keyboard shortcuts reference (desktop). Rows are filtered by the page context. */
export function ShortcutsDialog({ open, onOpenChange, context }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  context: 'owner' | 'guest'
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Raccourcis clavier" variant="dialog" size="sm">
      {GROUPS.map((group) => {
        const rows = group.rows.filter((r) => r.scope === 'both' || r.scope === context)
        if (rows.length === 0) return null
        return (
          <section key={group.title} className="shortcuts__group">
            <h3 className="shortcuts__heading">{group.title}</h3>
            {rows.map((r) => (
              <div key={r.label} className="shortcuts__row">
                <span>{r.label}</span>
                <span className="shortcuts__keys">
                  {r.keys.map((k) => <kbd key={k} className="kbd-static">{k}</kbd>)}
                </span>
              </div>
            ))}
          </section>
        )
      })}
      <p className="muted small">Les raccourcis à une lettre sont ignorés quand tu écris dans un champ.</p>
    </Sheet>
  )
}
