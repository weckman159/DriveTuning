import { LEGAL } from '@/lib/legal'

export default function DatenschutzPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-semibold text-white">Datenschutz</h1>
      <p className="text-zinc-400 text-sm">
        Hinweis: Dies ist ein Mustertext und ersetzt keine Rechtsberatung. Bitte passe ihn an deine tatsaechlichen Prozesse/Anbieter an.
      </p>

      <div className="panel p-5 text-zinc-300 space-y-4">
        <p className="text-sm text-zinc-300">
          DriveTuning ist ein Build Passport (System of Record) fuer Tuning-Projekte. Datenschutz ist privacy-by-default: Inhalte sind standardmaessig privat
          und werden nur durch ausdrueckliche Sichtbarkeits-Einstellungen oder Share-Links geteilt.
        </p>

        <h2 className="text-lg font-semibold text-white">1. Verantwortlicher</h2>
        <p className="text-sm text-zinc-300">
          Verantwortlicher im Sinne der DSGVO: {LEGAL.operatorName}, {LEGAL.address}, E-Mail: {LEGAL.email}
        </p>

        <h2 className="text-lg font-semibold text-white">2. Kategorien von Daten</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Konto- und Profildaten: z.B. Name, E-Mail, Login-Daten (je nach Auth-Konfiguration).</li>
          <li>Build-Daten: Fahrzeuge/Builds, Log-Eintraege, Modifikationen, Aufgaben/Workplan.</li>
          <li>Nachweise (Evidence): hochgeladene Dokumente/Fotos/Links inkl. Metadaten (Titel, Herausgeber, Nummer).</li>
          <li>Marktplatz-Daten: Listings, Medien, Chats, Angebote (falls genutzt).</li>
          <li>Freigaben: Share-Links (Token), Ablauf-/Widerrufsstatus.</li>
          <li>Aufruf-/Sicherheitsdaten: technische Logs zur Fehleranalyse und Absicherung.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">3. Zwecke und Rechtsgrundlagen</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Bereitstellung der Plattform und Verwaltung von Konten (Art. 6 Abs. 1 lit. b DSGVO).</li>
          <li>Speicherung und Darstellung deines Build Passports inkl. Freigabe-Funktionen (Art. 6 Abs. 1 lit. b DSGVO).</li>
          <li>IT-Sicherheit, Missbrauchspraevention, Fehleranalyse (Art. 6 Abs. 1 lit. f DSGVO).</li>
          <li>Einwilligungen, soweit erforderlich (Art. 6 Abs. 1 lit. a DSGVO).</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">4. Sharing (Sichtbarkeit)</h2>
        <p className="text-sm text-zinc-300">
          Inhalte sind standardmaessig nur fuer dich sichtbar. Du kannst Inhalte als oeffentlich, per Link (unlisted) oder privat einstellen.
          Share-Links koennen widerrufen oder mit Ablaufdatum versehen werden.
        </p>

        <h2 className="text-lg font-semibold text-white">5. Einwilligung/Aufrufprotokoll (Share-Link Aufrufe)</h2>
        <p className="text-sm text-zinc-300">
          Wenn ein Build ueber einen Share-Link aufgerufen wird, kann ein View-Event protokolliert werden. Dabei speichern wir keine Roh-IP-Adressen.
          Stattdessen kann ein gehashter, gesalzener Fingerprint (Viewer-Hash) zur Erkennung von Mehrfachaufrufen gespeichert werden.
        </p>

        <h2 className="text-lg font-semibold text-white">6. Empfaenger und Auftragsverarbeiter</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Hosting/Deployment: Vercel (Hosting, Build, Runtime).</li>
          <li>Datenbank: Postgres (z.B. Neon) fuer produktive Daten.</li>
          <li>Dateispeicher: Vercel Blob fuer Dokumente/Fotos (public URLs).</li>
          <li>Authentifizierung: NextAuth (je nach Provider/Setup).</li>
          <li>Zahlungen (optional): Stripe, falls Zahlungsfunktionen aktiviert werden.</li>
          <li>Performance-Messung (optional): Vercel Speed Insights.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">7. Drittlandtransfer</h2>
        <p className="text-sm text-zinc-300">
          Je nach eingesetzten Anbietern koennen Daten in Laender ausserhalb der EU/des EWR uebermittelt werden (z.B. USA). In diesem Fall werden
          geeignete Garantien (z.B. Standardvertragsklauseln) genutzt, soweit erforderlich.
        </p>

        <h2 className="text-lg font-semibold text-white">8. Speicherdauer</h2>
        <p className="text-sm text-zinc-300">
          Wir speichern Daten nur so lange, wie es fuer die Bereitstellung der Plattform und die genannten Zwecke erforderlich ist oder gesetzliche
          Aufbewahrungspflichten bestehen. Du kannst Inhalte loeschen, soweit Funktionen bereitgestellt sind.
        </p>

        <h2 className="text-lg font-semibold text-white">9. Deine Rechte</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung.</li>
          <li>Datenuebertragbarkeit (soweit anwendbar).</li>
          <li>Widerspruch gegen Verarbeitungen auf Basis berechtigter Interessen.</li>
          <li>Widerruf von Einwilligungen mit Wirkung fuer die Zukunft.</li>
          <li>Beschwerde bei einer Aufsichtsbehoerde.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">10. Kontakt</h2>
        <p className="text-sm text-zinc-300">Datenschutz-Kontakt: {LEGAL.email}</p>

        <p className="text-xs text-zinc-500">Stand: {LEGAL.lastUpdated}</p>
      </div>
    </div>
  )
}
