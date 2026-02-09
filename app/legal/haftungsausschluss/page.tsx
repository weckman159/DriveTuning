import Link from 'next/link'
import { LEGAL } from '@/lib/legal'

export default function HaftungsausschlussTuningPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-semibold text-white">Haftungsausschluss fuer Tuning-Informationen</h1>
      <p className="text-zinc-400 text-sm">
        Hinweis: Mustertext (Beta). Keine Rechtsberatung. Bitte pruefe und passe diesen Text an deine tatsaechlichen Prozesse an.
      </p>

      <div className="panel p-5 text-zinc-300 space-y-4">
        <p className="text-sm text-zinc-300">
          DriveTuning stellt technische Informationen zu Fahrzeugmodifikationen bereit. Diese ersetzen <strong>nicht</strong> die Pruefung durch einen amtlich
          anerkannten Sachverstaendigen bzw. eine Prueforganisation (z.B. TUEV/DEKRA/GTUE) im Sinne der gesetzlichen Anforderungen (z.B. HU gem. §29 StVZO)
          und keine Eintragung bei der Zulassungsstelle.
        </p>

        <h2 className="text-lg font-semibold text-white">1. Verantwortung</h2>
        <p className="text-sm text-zinc-300">
          Die Einhaltung der Strassenverkehrs-Zulassungs-Ordnung (StVZO) sowie weiterer einschlaegiger Vorschriften obliegt ausschliesslich dem Fahrzeughalter.
          DriveTuning uebernimmt keine Gewaehr fuer die Vollstaendigkeit oder Richtigkeit der bereitgestellten Informationen.
        </p>

        <h2 className="text-lg font-semibold text-white">2. Keine Haftung fuer Folgen</h2>
        <p className="text-sm text-zinc-300">
          DriveTuning uebernimmt keine Haftung fuer Bussgelder, Stilllegungen, Schaeden oder sonstige Nachteile, die aus nicht genehmigten oder unsachgemaess
          dokumentierten Modifikationen entstehen.
        </p>

        <h2 className="text-lg font-semibold text-white">3. BImSchG / Emissionen (Kontext)</h2>
        <p className="text-sm text-zinc-300">
          Insbesondere bei Eingriffen in Abgas-/Emissionssysteme (z.B. DPF/OPF/AGR) oder Chiptuning gelten strenge Vorgaben. DriveTuning kann Hinweise und
          Checklisten anzeigen, uebernimmt aber keine Garantie, dass eine Modifikation zulaessig ist oder Pruefungen besteht.
        </p>

        <h2 className="text-lg font-semibold text-white">4. Im Zweifel: Pruefen lassen</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Bei Zweifeln vor Umbau Ruecksprache mit einer Prueforganisation halten.</li>
          <li>Originaldokumente (ABE/ABG/Teilegutachten/ECE/Eintragung) aufbewahren und je nach Auflagen mitfuehren.</li>
          <li>Bei Kombinationen mehrerer Umbauten kann eine Einzelabnahme erforderlich werden.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">5. Kontakt/Anbieter</h2>
        <p className="text-sm text-zinc-300">
          Anbieter/Betreiber: {LEGAL.operatorName}. Kontakt: {LEGAL.email}.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <a className="text-sky-400 hover:text-sky-300 text-sm" href="https://www.tuev-sued.de/de" target="_blank" rel="noreferrer">
            TUEV Sued
          </a>
          <a className="text-sky-400 hover:text-sky-300 text-sm" href="https://www.tuev-nord.de/" target="_blank" rel="noreferrer">
            TUEV Nord
          </a>
          <a className="text-sky-400 hover:text-sky-300 text-sm" href="https://www.dekra.de/" target="_blank" rel="noreferrer">
            DEKRA
          </a>
          <Link className="text-sky-400 hover:text-sky-300 text-sm" href="/datenschutz">
            Datenschutz
          </Link>
        </div>

        <p className="text-xs text-zinc-500">Stand: {LEGAL.lastUpdated}</p>
      </div>
    </div>
  )
}
