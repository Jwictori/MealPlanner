import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Unit {
  name: string
  display_name: string
  type: string
}

interface UnitSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function UnitSelect({ value, onChange, className = "" }: UnitSelectProps) {
  // Handle null/undefined value to avoid React warning
  const safeValue = value ?? ""
  const [units, setUnits] = useState<Unit[]>([])

  useEffect(() => {
    loadUnits()
  }, [])

  const loadUnits = async () => {
    const { data, error } = await supabase
      .from('units')
      .select('name, display_name, type')
      .order('name')

    if (!error && data) {
      setUnits(data)
    }
  }

  // Group units by type
  const groupedUnits = units.reduce((acc, unit) => {
    if (!acc[unit.type]) acc[unit.type] = []
    acc[unit.type].push(unit)
    return acc
  }, {} as Record<string, Unit[]>)

  const typeLabels: Record<string, string> = {
    weight: 'Vikt',
    volume: 'Volym',
    piece: 'Styck',
    other: 'Övrigt',
  }

  return (
    <select
      value={safeValue}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">Enhet</option>
      {Object.entries(groupedUnits).map(([type, typeUnits]) => (
        <optgroup key={type} label={typeLabels[type] || type}>
          {typeUnits.map((unit) => (
            <option key={unit.name} value={unit.name}>
              {unit.name} ({unit.display_name})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
