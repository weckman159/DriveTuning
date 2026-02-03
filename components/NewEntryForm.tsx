'use client'

import { useState } from 'react'
import { TuvBadge } from './TuvBadge'

type LogEntryType = 'MODIFICATION' | 'MAINTENANCE' | 'TRACK_DAY' | 'DYNO'
type ModificationCategory = 'SUSPENSION' | 'ENGINE' | 'EXHAUST' | 'BRAKES' | 'WHEELS' | 'AERO' | 'INTERIOR' | 'OTHER'
type TuvStatus = 'GREEN_REGISTERED' | 'YELLOW_ABE' | 'RED_RACING'

interface Props {
  carId: string
  onSubmitSuccess?: () => void
}

export default function NewEntryForm({ carId, onSubmitSuccess }: Props) {
  const [type, setType] = useState<LogEntryType>('MODIFICATION')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [partName, setPartName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<ModificationCategory>('SUSPENSION')
  const [price, setPrice] = useState('')
  const [tuvStatus, setTuvStatus] = useState<TuvStatus>('YELLOW_ABE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function resetForm() {
    setTitle('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setPartName('')
    setBrand('')
    setPrice('')
    setTuvStatus('YELLOW_ABE')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const payload = {
      carId,
      type,
      title,
      description,
      date,
      ...(type === 'MODIFICATION' && {
        modification: {
          partName,
          brand,
          category,
          price: price ? parseFloat(price) : null,
          tuvStatus,
        },
      }),
    }

    try {
      const res = await fetch(`/api/cars/${carId}/log-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create entry')
      }

      setSuccess(true)
      resetForm()

      if (onSubmitSuccess) {
        onSubmitSuccess()
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
      {/* Entry Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Entry Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as LogEntryType)}
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
        >
          <option value="MODIFICATION">Modification</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="TRACK_DAY">Track Day</option>
          <option value="DYNO">Dyno Session</option>
        </select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., KW V3 coilovers installed"
          required
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Modification Fields */}
      {type === 'MODIFICATION' && (
        <div className="space-y-4 pt-4 border-t border-zinc-700">
          <h3 className="text-lg font-medium text-white">Modification Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Part Name</label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g., Coilovers"
                required
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., KW"
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ModificationCategory)}
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                <option value="SUSPENSION">Suspension</option>
                <option value="ENGINE">Engine</option>
                <option value="EXHAUST">Exhaust</option>
                <option value="BRAKES">Brakes</option>
                <option value="WHEELS">Wheels</option>
                <option value="AERO">Aero</option>
                <option value="INTERIOR">Interior</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Price (€)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* TUV Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">TÜV Status</label>
            <div className="flex gap-3">
              {(['GREEN_REGISTERED', 'YELLOW_ABE', 'RED_RACING'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTuvStatus(status)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tuvStatus === status
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  <div className="flex justify-center">
                    <TuvBadge status={status} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="space-y-2">
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
        {success && (
          <p className="text-green-400 text-sm text-center">Entry created successfully</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Entry'
          )}
        </button>
      </div>
    </form>
  )
}
