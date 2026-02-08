import { LEGAL } from '@/lib/legal'

export default function AgbPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-white">AGB</h1>
      <p className="text-zinc-400 text-sm">
        Hinweis: Dies ist ein Mustertext (Beta) und ersetzt keine Rechtsberatung. Bitte pruefe und passe die Bedingungen vor Aktivierung von Zahlungen/Versand an.
      </p>

      <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-zinc-300 space-y-4">
        <h2 className="text-lg font-semibold text-white">1. Anbieter</h2>
        <p className="text-sm text-zinc-300">
          {LEGAL.operatorName}, E-Mail: {LEGAL.email}
        </p>

        <h2 className="text-lg font-semibold text-white">2. Geltungsbereich</h2>
        <p className="text-sm text-zinc-300">
          Diese AGB gelten fuer die Nutzung der Plattform DriveTuning (Build Passport) sowie fuer Marktplatz-Funktionen, soweit diese genutzt werden.
        </p>

        <h2 className="text-lg font-semibold text-white">3. Registrierung und Konto</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Die Nutzung bestimmter Funktionen setzt ein Nutzerkonto voraus.</li>
          <li>Du bist verpflichtet, Zugangsdaten vertraulich zu behandeln und Missbrauch unverzueglich zu melden.</li>
          <li>Du bist fuer Inhalte verantwortlich, die du hochlaedst oder veroeffentlichst.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">4. Build Passport (System of Record)</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>DriveTuning dient der Dokumentation von Fahrzeug-Builds inkl. Log-Eintraegen, Modifikationen, Dokumenten und Medien.</li>
          <li>Privacy-by-default: Inhalte sind standardmaessig privat und koennen durch Sichtbarkeit/Share-Links geteilt werden.</li>
          <li>Du entscheidest, welche Inhalte oeffentlich oder per Link sichtbar sind. Bitte teile keine Daten, die du nicht teilen willst.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">5. Inhalte, Nachweise und Rechte</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Du behaeltst alle Rechte an deinen Inhalten (Fotos, Dokumente, Texte).</li>
          <li>Du raeumst DriveTuning das technisch notwendige Nutzungsrecht ein, um Inhalte zu speichern, anzuzeigen und zu uebermitteln.</li>
          <li>Es ist untersagt, rechtswidrige Inhalte hochzuladen (z.B. urheberrechtsverletzende Dokumente, persoenliche Daten Dritter ohne Rechtsgrundlage).</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">6. Marktplatz (Listings, Chat, Angebote)</h2>
        <p className="text-sm text-zinc-300">
          Der Marktplatz ermoeglicht Nutzern, Teile mit Historie zu listen, Nachrichten zu senden und Angebote auszutauschen. Kaufvertraege kommen grundsaetzlich
          direkt zwischen Kaeufer und Verkaeufer zustande. DriveTuning ist nicht Vertragspartner dieser Vertraege, soweit nicht ausdruecklich anders geregelt.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Listings muessen wahrheitsgemaess sein (Zustand, Preis, Laufleistung, Dokumente).</li>
          <li>Keine Umgehung von Sicherheitsmechanismen, kein Spam, keine betruegerischen Angebote.</li>
          <li>DriveTuning kann Listings oder Konten bei Regelverstoessen sperren oder entfernen.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">7. Zahlungen, Versand, Kaeferschutz (falls aktiviert)</h2>
        <p className="text-sm text-zinc-300">
          Falls Zahlungsfunktionen aktiviert werden, kann ein externer Zahlungsdienstleister (z.B. Stripe) eingesetzt werden. In diesem Fall koennen zusaetzliche
          Bedingungen und Identitaetspruefungen gelten. Details werden im Checkout bzw. in den jeweiligen Flow-Texen angezeigt.
        </p>

        <h2 className="text-lg font-semibold text-white">8. Haftung</h2>
        <p className="text-sm text-zinc-300">
          Die Plattform wird im Beta-Status bereitgestellt. Wir haften nicht fuer die Richtigkeit/Vollstaendigkeit von Nutzerinhalten. Fuer Schaeden haften wir
          nach den gesetzlichen Vorschriften; bei leichter Fahrlaessigkeit nur bei Verletzung wesentlicher Vertragspflichten und beschraenkt auf den typischen,
          vorhersehbaren Schaden.
        </p>

        <h2 className="text-lg font-semibold text-white">9. Kuendigung/Sperrung</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Du kannst dein Konto nach Massgabe der angebotenen Funktionen kuendigen/loeschen.</li>
          <li>Wir koennen Konten bei schwerwiegenden Verstoessen sperren oder kuendigen.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">10. Schlussbestimmungen</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
          <li>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts, soweit zulaessig.</li>
          <li>Gerichtsstand: TODO (falls zulaessig).</li>
          <li>Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Uebrigen wirksam.</li>
        </ul>

        <p className="text-xs text-zinc-500">Stand: {LEGAL.lastUpdated}</p>
      </div>
    </div>
  )
}
