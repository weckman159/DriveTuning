'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface ModificationData {
  partName: string
  brand: string | null
  category: string
  car: {
    make: string
    model: string
    generation: string | null
  } | null
  mileageOnCar: number | null
  tuvStatus: string
}

export default function NewListingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const modificationId = searchParams.get('modificationId')

  const [loading, setLoading] = useState(!!modificationId)
  const [modification, setModification] = useState<ModificationData | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<'USED' | 'LIKE_NEW' | 'NEW'>('USED')
  const [mileageOnCar, setMileageOnCar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch modification data if provided
  useEffect(() => {
    if (modificationId) {
      // In real app: fetch from API
      // Mock data for demo
      setTimeout(() => {
        setModification({
          partName: 'KW V3 coilovers',
          brand: 'KW',
          category: 'SUSPENSION',
          car: { make: 'BMW', model: 'M4', generation: 'G82' },
          mileageOnCar: 65230,
          tuvStatus: 'YELLOW_ABE',
        })
        setLoading(false)
      }, 500)
    }
  }, [modificationId])

  // Auto-populate fields when modification data is loaded
  useEffect(() => {
    if (modification) {
      setTitle(`${modification.brand || ''} ${modification.partName}`.trim())
      setMileageOnCar(modification.mileageOnCar?.toString() || '')
      setDescription(
        `Used on ${modification.car?.make} ${modification.car?.model} ${modification.car?.generation || ''} for ${modification.mileageOnCar?.toLocaleString() || 0} km. ${modification.tuvStatus === 'YELLOW_ABE' ? 'ABE available.' : ''}`
      )
    }
  }, [modification])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/market/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price),
          condition,
          mileageOnCar: mileageOnCar ? parseInt(mileageOnCar) : null,
          modificationId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create listing')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/market')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loading && modificationId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Create Listing</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., KW V3 coilovers"
            required
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Price (€)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as typeof condition)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          >
            <option value="USED">Used</option>
            <option value="LIKE_NEW">Like New</option>
            <option value="NEW">New</option>
          </select>
        </div>

        {/* Mileage on Car */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Mileage on Car (km)</label>
          <input
            type="number"
            value={mileageOnCar}
            onChange={(e) => setMileageOnCar(e.target.value)}
            placeholder="0"
            min="0"
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Submit */}
        <div className="space-y-2">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">Listing created! Redirecting...</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  )
}
