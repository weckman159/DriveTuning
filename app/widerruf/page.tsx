import { LEGAL } from '@/lib/legal'

export default function WiderrufPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-semibold text-white">Widerruf</h1>
      <p className="text-zinc-400 text-sm">
        Hinweis: Dies ist ein Mustertext und ersetzt keine Rechtsberatung. Bitte passe ihn an deine tatsaechlichen Produkte/Leistungen an.
      </p>

      <div className="panel p-5 text-zinc-300 space-y-4">
        <p className="text-sm text-zinc-300">
          Diese Widerrufsbelehrung gilt fuer Verbraucher im Sinne von § 13 BGB, wenn ein entgeltlicher Vertrag (z.B. Abo/Pro-Funktionen oder kostenpflichtige
          Services) mit DriveTuning zustande kommt.
        </p>

        <h2 className="text-lg font-semibold text-white">Widerrufsbelehrung</h2>
        <h3 className="text-base font-semibold text-white">Widerrufsrecht</h3>
        <p className="text-sm text-zinc-300">
          Du hast das Recht, binnen 14 Tagen ohne Angabe von Gruenden diesen Vertrag zu widerrufen.
          Die Widerrufsfrist betraegt 14 Tage ab dem Tag des Vertragsabschlusses.
        </p>

        <h3 className="text-base font-semibold text-white">Ausuebung des Widerrufs</h3>
        <p className="text-sm text-zinc-300">
          Um dein Widerrufsrecht auszuueben, musst du uns ({LEGAL.operatorName}, {LEGAL.address}, E-Mail: {LEGAL.email}) mittels einer eindeutigen Erklaerung (z.B. E-Mail)
          ueber deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafuer das untenstehende Muster-Widerrufsformular verwenden, das jedoch
          nicht vorgeschrieben ist.
        </p>
        <p className="text-sm text-zinc-300">
          Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung ueber die Ausuebung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
        </p>

        <h3 className="text-base font-semibold text-white">Folgen des Widerrufs</h3>
        <p className="text-sm text-zinc-300">
          Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzueglich und spaetestens binnen 14 Tagen ab dem
          Tag zurueckzuzahlen, an dem die Mitteilung ueber deinen Widerruf bei uns eingegangen ist. Fuer diese Rueckzahlung verwenden wir dasselbe Zahlungsmittel,
          das du bei der urspruenglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdruecklich etwas anderes vereinbart.
        </p>

        <h3 className="text-base font-semibold text-white">Erloschen des Widerrufsrechts bei digitalen Leistungen</h3>
        <p className="text-sm text-zinc-300">
          Bei einem Vertrag ueber die Bereitstellung digitaler Inhalte oder digitaler Dienstleistungen kann das Widerrufsrecht erloeschen, wenn wir mit der
          Ausfuehrung des Vertrags begonnen haben, nachdem du
          (1) ausdruecklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist mit der Ausfuehrung beginnen, und
          (2) deine Kenntnis bestaetigt hast, dass du dadurch dein Widerrufsrecht verlierst.
        </p>

        <h2 className="text-lg font-semibold text-white">Muster-Widerrufsformular</h2>
        <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-200 whitespace-pre-wrap">
          {`(Wenn du den Vertrag widerrufen willst, dann fuelle bitte dieses Formular aus und sende es zurueck.)

An: ${LEGAL.operatorName}, ${LEGAL.address}, E-Mail: ${LEGAL.email}

Hiermit widerrufe ich den von mir abgeschlossenen Vertrag ueber die Erbringung der folgenden Leistung:

Bestellt am / abgeschlossen am: ____________
Name des Verbrauchers: ______________________
Anschrift des Verbrauchers: _________________

Unterschrift des Verbrauchers (nur bei Mitteilung auf Papier): ____________
Datum: ____________`}
        </div>

        <p className="text-xs text-zinc-500">Stand: {LEGAL.lastUpdated}</p>
      </div>
    </div>
  )
}
