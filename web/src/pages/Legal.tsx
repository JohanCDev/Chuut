import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Screen, ScreenBody, TopBar } from '../ui'

const UPDATED = '12 octobre 2026'
const CONTACT = 'johan@chrillesen.net'
const Mail = () => <a href={`mailto:${CONTACT}`}>{CONTACT}</a>

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen>
      <TopBar />
      <ScreenBody gap={20}>
        <div className="stack-sm">
          <h1>{title}</h1>
          <p className="muted small">Dernière mise à jour : {UPDATED}</p>
        </div>
        <div className="legal-doc">{children}</div>
      </ScreenBody>
    </Screen>
  )
}

export function Terms() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <h2>1. Le service</h2>
      <p>
        Chuut permet de créer des listes de souhaits et de les partager par lien. Les personnes invitées peuvent réserver
        un souhait pour l'offrir, sans que l'auteur de la liste ne voie qui a réservé quoi. Le service est gratuit, sans
        publicité ni lien affilié.
      </p>

      <h2>2. Âge et compte</h2>
      <p>
        Chuut est réservé aux personnes de 15 ans et plus. Tu peux rejoindre une liste avec un simple prénom (compte
        invité) ou créer un compte avec ton e-mail ou Google. Tu es responsable de la confidentialité de tes identifiants.
        Un compte invité inactif pendant 90 jours est supprimé automatiquement.
      </p>

      <h2>3. Ce que tu publies</h2>
      <p>
        Tu restes propriétaire de ce que tu ajoutes (titres, notes, liens, photos). Tu nous autorises seulement à le
        stocker et à l'afficher aux personnes avec qui tu partages ta liste. Tu t'engages à ne rien publier d'illégal,
        de haineux, de violent, de sexuellement explicite, ni de contenu qui porte atteinte aux droits d'autrui.
        Nous pouvons supprimer un contenu ou un compte qui ne respecte pas ces règles.
      </p>

      <h2>4. Partage et secret</h2>
      <p>
        Toute personne qui possède le lien d'une liste peut la consulter et la rejoindre : ne le partage qu'avec des
        personnes de confiance. Chuut cache les réservations à l'auteur de la liste, mais ne peut pas empêcher les
        invités d'en parler entre eux.
      </p>

      <h2>5. Achats et liens externes</h2>
      <p>
        Chuut ne vend rien. Les liens vers des boutiques, les prix et les images récupérés automatiquement sont fournis à
        titre indicatif et peuvent être inexacts. Les achats se font directement auprès des marchands, sous leurs propres
        conditions.
      </p>

      <h2>6. Disponibilité et responsabilité</h2>
      <p>
        Chuut est un projet personnel fourni tel quel. Nous faisons de notre mieux pour qu'il fonctionne, sans garantie
        de disponibilité continue ni d'absence d'erreur. Nous ne sommes pas responsables d'un cadeau en double, oublié ou
        mal réservé, ni des contenus publiés par les utilisateurs.
      </p>

      <h2>7. Fin d'utilisation</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis « Mon compte ». Tes listes, souhaits, photos et réservations
        sont alors effacés. Nous pouvons faire évoluer ou arrêter le service ; en cas d'arrêt, nous te préviendrons
        autant que possible pour que tu puisses télécharger tes données.
      </p>

      <h2>8. Modifications</h2>
      <p>
        Ces conditions peuvent évoluer. La date de mise à jour figure en haut de la page. En cas de changement important,
        nous t'en informerons dans l'application.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit français. En cas de litige, contacte-nous d'abord pour trouver une solution
        amiable : <Mail />. À défaut, les tribunaux français sont compétents.
      </p>

      <h2>Mentions légales</h2>
      <p>
        Éditeur : Johan Chrillesen, particulier, à titre non professionnel. Contact : <Mail />.<br />
        Hébergement : Google Cloud / Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande.
      </p>

      <p>Voir aussi la <Link to="/confidentialite">politique de confidentialité</Link>.</p>
    </LegalPage>
  )
}

export function Privacy() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Responsable du traitement</h2>
      <p>Johan Chrillesen, éditeur de Chuut. Contact : <Mail />.</p>

      <h2>Données collectées</h2>
      <ul>
        <li>Compte : adresse e-mail, mode de connexion (e-mail ou Google), prénom affiché, confirmation de l'âge.</li>
        <li>Compte invité : prénom affiché et un identifiant technique anonyme.</li>
        <li>Contenu : listes, souhaits (titre, lien, prix, note, photo), listes rejointes et réservations.</li>
        <li>Technique : journaux de sécurité et de fonctionnement fournis par l'hébergeur, protection anti-abus (reCAPTCHA).</li>
      </ul>
      <p>Pas de publicité, pas de suivi publicitaire, pas de revente de données.</p>

      <h2>Pourquoi et sur quelle base</h2>
      <ul>
        <li>Fournir le service (créer, partager, réserver) : exécution des conditions d'utilisation.</li>
        <li>Protéger le service contre les abus : intérêt légitime.</li>
      </ul>

      <h2>Qui voit quoi</h2>
      <ul>
        <li>Les personnes qui ont le lien d'une liste voient la liste, ses souhaits et le prénom de son auteur.</li>
        <li>Les invités d'une liste voient le prénom de ceux qui ont réservé. L'auteur de la liste ne voit pas les réservations.</li>
        <li>Quand tu ajoutes un lien, notre serveur consulte cette page pour en récupérer le titre, le prix et l'image.</li>
      </ul>

      <h2>Sous-traitants et localisation</h2>
      <p>
        Les données sont hébergées par Google (Firebase) dans l'Union européenne. La connexion avec Google et reCAPTCHA
        sont fournis par Google, qui peut traiter certaines données hors de l'UE dans le cadre de garanties appropriées
        (clauses contractuelles types, Data Privacy Framework).
      </p>

      <h2>Durée de conservation</h2>
      <ul>
        <li>Compte : jusqu'à sa suppression par toi.</li>
        <li>Compte invité : supprimé après 90 jours d'inactivité.</li>
        <li>Liste supprimée : effacée immédiatement avec ses souhaits, photos et réservations.</li>
      </ul>

      <h2>Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les rectifier, les supprimer, t'opposer à leur traitement ou en demander la
        portabilité. Depuis « Mon compte », tu peux télécharger tes données et supprimer ton compte. Pour toute autre
        demande : <Mail />. Tu peux aussi saisir la CNIL (cnil.fr).
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        Chuut n'utilise que le stockage nécessaire au fonctionnement : garder ta session ouverte et protéger le service
        contre les abus. Aucun cookie publicitaire ou de mesure d'audience.
      </p>

      <p>Voir aussi les <Link to="/conditions">conditions d'utilisation</Link>.</p>
    </LegalPage>
  )
}
