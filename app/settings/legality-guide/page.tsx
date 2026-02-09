export default function LegalityGuidePage() {
  const steps = [
    {
      title: '1. Vorbereitung',
      items: [
        'Original Gutachten/ABE/ABG mitnehmen (gedruckt + digital).',
        'Zulassungsbescheinigung Teil I (Fahrzeugschein) bereithalten.',
        'Bei Teilegutachten: Montagebestaetigung/Werkstattrechnung (falls gefordert).',
        'Bei §21: technische Unterlagen (Material, Zeichnungen, Datenblaetter) sammeln.',
      ],
    },
    {
      title: '2. Einbau korrekt dokumentieren',
      items: [
        'Fotos vom Einbau machen (vorher/nachher).',
        'Teilenummern und Kennzeichnungen fotografieren (E-Mark, KBA, Seriennummer).',
        'Alle Auflagen aus ABE/ABG/Gutachten notieren (Reifen, ET, Mindestbodenfreiheit, usw.).',
      ],
    },
    {
      title: '3. Pruefung / Abnahme',
      items: [
        'ABE/ABG: oft keine Eintragung, aber Auflagen koennen gelten. Dokument ggf. mitfuehren.',
        'Teilegutachten: Aenderungsabnahme (z.B. TUEV/DEKRA/GTUE) und danach Eintragung, wenn gefordert.',
        '§21 Einzelabnahme: vorher Termin/Unterlagen abstimmen (Kombinationswirkung!).',
      ],
    },
    {
      title: '4. Nachweise in DriveTuning speichern',
      items: [
        'PDF/Fotos von ABE/ABG/Teilegutachten hochladen.',
        'Eintragung / Pruefbericht (wenn vorhanden) hochladen.',
        'Im LogEntry den Umbau mit Datum/Kilometerstand dokumentieren.',
      ],
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-semibold text-white">TUEV Guide (DE, Beta)</h1>
      <p className="text-zinc-400 text-sm">
        Checkliste fuer die Praxis. Keine Rechtsberatung. Im Zweifel immer Ruecksprache mit einer Prueforganisation halten.
      </p>

      <div className="panel p-5 text-zinc-300 space-y-6">
        {steps.map((s) => (
          <section key={s.title} className="space-y-2">
            <h2 className="text-lg font-semibold text-white">{s.title}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
              {s.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </section>
        ))}

        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100/90">
          <div className="font-semibold text-amber-100">Wichtig</div>
          <p className="mt-2">
            Kombinationen (z.B. Fahrwerk + Raeder + Spurplatten) koennen trotz einzelner Dokumente eine weitergehende Pruefung ausloesen.
            DriveTuning hilft beim Sammeln der Nachweise, ersetzt aber keine Abnahme.
          </p>
        </div>
      </div>
    </div>
  )
}

