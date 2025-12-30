import { useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { sv } from 'date-fns/locale'

interface DateRangeSelectorProps {
  onSelectRange?: (startDate: string, endDate: string) => void
  onSelect?: (range: { start: string; end: string }) => void  // Legacy for wizard
  onCancel?: () => void
  currentDate?: Date
  maxDays?: number
}

export function DateRangeSelector({
  onSelectRange,
  onSelect,
  onCancel,
  currentDate = new Date(),
  maxDays
}: DateRangeSelectorProps) {
  
  const [startDate, setStartDate] = useState(format(currentDate, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addDays(currentDate, 6), 'yyyy-MM-dd'))
  
  const presets = [
    {
      label: 'Denna vecka',
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      days: 7
    },
    {
      label: 'Nästa vecka',
      start: addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 7),
      end: addDays(endOfWeek(currentDate, { weekStartsOn: 1 }), 7),
      days: 7
    },
    {
      label: 'Denna månad',
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
      days: 30
    },
    {
      label: '7 dagar',
      start: currentDate,
      end: addDays(currentDate, 6),
      days: 7
    },
    {
      label: '14 dagar',
      start: currentDate,
      end: addDays(currentDate, 13),
      days: 14
    },
    {
      label: '30 dagar',
      start: currentDate,
      end: addDays(currentDate, 29),
      days: 30
    }
  ].filter(preset => !maxDays || preset.days <= maxDays)
  
  const handlePresetClick = (start: Date, end: Date) => {
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }
  
  const handleConfirm = () => {
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    if (maxDays && daysDiff > maxDays) {
      alert(`Maximum ${maxDays} dagar tillåtet för denna funktion`)
      return
    }
    
    // Call the appropriate callback
    if (onSelectRange) {
      onSelectRange(startDate, endDate)
    }
    if (onSelect) {
      onSelect({ start: startDate, end: endDate })
    }
  }
  
  const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200 max-w-lg">
      <h3 className="text-lg font-bold mb-4">
        Välj datumspann
        {maxDays && <span className="text-sm font-normal text-gray-600 ml-2">(max {maxDays} dagar)</span>}
      </h3>
      
      {/* Quick presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Snabbval:</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handlePresetClick(preset.start, preset.end)}
              className="px-3 py-2 bg-gray-100 hover:bg-primary hover:text-white rounded-lg text-sm font-medium transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom date range */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Eller välj eget spann:</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Från:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Till:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={maxDays ? format(addDays(new Date(startDate), maxDays - 1), 'yyyy-MM-dd') : undefined}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>
      
      {/* Selected range preview */}
      <div className={`mb-4 p-3 rounded-lg ${
        maxDays && daysDiff > maxDays ? 'bg-red-50' : 'bg-blue-50'
      }`}>
        <p className={`text-sm ${
          maxDays && daysDiff > maxDays ? 'text-red-900' : 'text-blue-900'
        }`}>
          <strong>Valt spann:</strong> {format(new Date(startDate), 'd MMM', { locale: sv })} - {format(new Date(endDate), 'd MMM yyyy', { locale: sv })}
        </p>
        <p className={`text-xs mt-1 ${
          maxDays && daysDiff > maxDays ? 'text-red-700 font-bold' : 'text-blue-700'
        }`}>
          {daysDiff} dagar
          {maxDays && daysDiff > maxDays && ` (överstiger max ${maxDays} dagar!)`}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={maxDays ? daysDiff > maxDays : false}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Fortsätt
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-all"
        >
          Avbryt
        </button>
      </div>
    </div>
  )
}