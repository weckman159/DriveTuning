import 'server-only'

import raw from '@/data/reference/places.de.json'

export type PlaceDictType = 'state' | 'city' | 'district'

export type PlaceSuggestion = {
  id: string
  label: string
  value: string
  stateId?: string
  cityId?: string
}

type PlaceState = {
  id: string
  name: string
  nameEn?: string | null
  capital?: string | null
  population?: number | null
  areaKm2?: number | null
  region?: string | null
  isCityState?: boolean | null
}

type PlaceCity = {
  id: string
  name: string
  stateId: string
  population?: number | null
  hasDistricts?: boolean | null
  postalCodePrefix?: string | null
}

type PlaceDistrict = {
  id: string
  name: string
  population?: number | null
}

type PlacesPayload = {
  version: number
  generatedAt: string
  country: string
  countryName: string
  states: PlaceState[]
  cities: PlaceCity[]
  districtsByCity: Record<string, PlaceDistrict[]>
}

const places = raw as unknown as PlacesPayload

function norm(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
}

function compareByRelevance(a: string, b: string, q: string) {
  const qa = norm(q)
  const an = norm(a)
  const bn = norm(b)

  const ai = qa ? an.indexOf(qa) : 0
  const bi = qa ? bn.indexOf(qa) : 0

  const ap = ai === 0 ? 0 : 1
  const bp = bi === 0 ? 0 : 1
  if (ap !== bp) return ap - bp

  const aidx = ai < 0 ? 9999 : ai
  const bidx = bi < 0 ? 9999 : bi
  if (aidx !== bidx) return aidx - bidx

  if (an.length !== bn.length) return an.length - bn.length

  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

function clampLimit(limit?: number) {
  const n = typeof limit === 'number' ? limit : 10
  return Math.max(1, Math.min(25, Math.floor(n)))
}

function stateById() {
  const map = new Map<string, PlaceState>()
  for (const s of places.states || []) {
    if (!s?.id) continue
    map.set(String(s.id).toUpperCase(), s)
  }
  return map
}

const STATES_BY_ID = stateById()

export function suggestPlaces(input: {
  type: PlaceDictType
  q: string
  limit?: number
  stateId?: string | null
  cityId?: string | null
}): PlaceSuggestion[] {
  const q = String(input.q || '')
  const qn = norm(q)
  const limit = clampLimit(input.limit)

  if (input.type === 'state') {
    const list = (places.states || []).slice()
    if (!qn) {
      list.sort((a, b) => (Number(b.population || 0) - Number(a.population || 0)) || a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }))
      return list.slice(0, limit).map((s) => ({ id: s.id, value: s.name, label: s.name, stateId: s.id }))
    }
    const filtered = list.filter((s) => norm(s.name).includes(qn) || (s.id && norm(s.id).includes(qn)))
    filtered.sort((a, b) => compareByRelevance(a.name, b.name, q))
    return filtered.slice(0, limit).map((s) => ({ id: s.id, value: s.name, label: `${s.name} (${s.id})`, stateId: s.id }))
  }

  if (input.type === 'city') {
    const stateFilter = input.stateId ? String(input.stateId).trim().toUpperCase() : ''
    const list = (places.cities || []).filter((c) => (stateFilter ? c.stateId === stateFilter : true))
    if (!qn) {
      if (!stateFilter) return []
      list.sort((a, b) => (Number(b.population || 0) - Number(a.population || 0)) || a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }))
      return list.slice(0, limit).map((c) => ({ id: c.id, value: c.name, label: c.name, cityId: c.id, stateId: c.stateId }))
    }
    const filtered = list.filter((c) => norm(c.name).includes(qn))
    filtered.sort((a, b) => compareByRelevance(a.name, b.name, q))
    return filtered
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        value: c.name,
        label: `${c.name} (${c.stateId})`,
        cityId: c.id,
        stateId: c.stateId,
      }))
  }

  // district
  const cityId = input.cityId ? String(input.cityId).trim().toLowerCase() : ''
  const list = cityId && places.districtsByCity ? places.districtsByCity[cityId] || [] : []
  if (list.length === 0) return []

  const cityName = cityId ? (places.cities || []).find((c) => c.id === cityId)?.name : null

  if (!qn) {
    const sorted = list.slice().sort((a, b) => (Number(b.population || 0) - Number(a.population || 0)) || a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }))
    return sorted.slice(0, limit).map((d) => ({
      id: d.id,
      value: d.name,
      label: d.name,
      cityId,
    }))
  }

  const filtered = list.filter((d) => norm(d.name).includes(qn))
  filtered.sort((a, b) => compareByRelevance(a.name, b.name, q))

  return filtered.slice(0, limit).map((d) => ({
    id: d.id,
    value: d.name,
    label: cityName ? `${d.name} · ${cityName}` : d.name,
    cityId,
  }))
}

export function getStateNameById(stateId: string | null | undefined): string | null {
  const id = String(stateId || '').trim().toUpperCase()
  if (!id) return null
  return STATES_BY_ID.get(id)?.name || null
}

export function cityHasDistricts(cityId: string | null | undefined): boolean {
  const id = String(cityId || '').trim().toLowerCase()
  if (!id) return false
  const entry = (places.cities || []).find((c) => c.id === id)
  return Boolean(entry?.hasDistricts && places.districtsByCity && Array.isArray(places.districtsByCity[id]) && places.districtsByCity[id].length > 0)
}

