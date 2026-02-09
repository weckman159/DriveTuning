import { LEGAL } from '@/lib/legal'

export default function ImpressumPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-semibold text-white">Impressum</h1>
      <p className="text-zinc-400 text-sm">
        Hinweis: Dies ist ein Mustertext und ersetzt keine Rechtsberatung. Bitte pruefe und ergaenze die Angaben vor dem Livegang.
      </p>

      <div className="panel p-5 text-zinc-300 space-y-3">
        <h2 className="text-lg font-semibold text-white">Angaben gemaess § 5 TMG</h2>
        <div className="space-y-1 text-sm">
          <p><span className="text-zinc-400">Anbieter/Betreiber:</span> {LEGAL.operatorName}</p>
          <p><span className="text-zinc-400">Anschrift:</span> {LEGAL.address}</p>
          <p>
            <span className="text-zinc-400">Kontakt:</span> E-Mail: {LEGAL.email}
            {LEGAL.phone ? ` • Telefon (optional): ${LEGAL.phone}` : null}
          </p>
        </div>

        <h2 className="text-lg font-semibold text-white">Vertretungsberechtigte Person</h2>
        <p className="text-sm text-zinc-300">{LEGAL.representative || '(bitte vertretungsberechtigte Person eintragen)'}</p>

        <h2 className="text-lg font-semibold text-white">Registereintrag (falls vorhanden)</h2>
        <p className="text-sm text-zinc-300">{LEGAL.register || '(falls vorhanden: Registergericht, Registernummer)'}</p>

        <h2 className="text-lg font-semibold text-white">Umsatzsteuer</h2>
        <p className="text-sm text-zinc-300">
          USt-IdNr. gemaess § 27a UStG: {LEGAL.vatId || '(falls vorhanden)'}
        </p>

        <h2 className="text-lg font-semibold text-white">Verantwortlich fuer Inhalte</h2>
        <p className="text-sm text-zinc-300">
          Verantwortlich i.S.d. § 18 Abs. 2 MStV: {LEGAL.contentResponsible || '(bitte eintragen)'}
        </p>

        <h2 className="text-lg font-semibold text-white">Online-Streitbeilegung</h2>
        <p className="text-sm text-zinc-300">
          Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
          {' '}
          <a className="text-sky-400 hover:text-sky-300" href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
        <p className="text-sm text-zinc-300">Unsere E-Mail-Adresse findest du oben im Impressum.</p>

        <h2 className="text-lg font-semibold text-white">Haftung</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Haftung fuer Inhalte: Wir sind fuer eigene Inhalte nach den allgemeinen Gesetzen verantwortlich.</li>
          <li>Haftung fuer Links: Externe Links liegen ausserhalb unseres Verantwortungsbereichs; bitte pruefe Inhalte beim Aufruf.</li>
          <li>Urheberrecht: Inhalte dieser Website unterliegen dem Urheberrecht. Vervielfaeltigung nur mit Zustimmung, soweit gesetzlich nicht erlaubt.</li>
        </ul>

        <p className="text-xs text-zinc-500">Stand: {LEGAL.lastUpdated}</p>
      </div>
    </div>
  )
}
