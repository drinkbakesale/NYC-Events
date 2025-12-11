'use client'

import { useState } from 'react'

interface DateRangeSelectorProps {
  dateRange: { start: Date; end: Date }
  onChange: (range: { start: Date; end: Date }) => void
}

type PresetRange = 'next-7' | 'next-14' | 'this-week' | 'custom'

export default function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  const [activePreset, setActivePreset] = useState<PresetRange>('next-7')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePreset = (preset: PresetRange) => {
    setActivePreset(preset)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    let end = new Date()

    switch (preset) {
      case 'next-7':
        end.setDate(end.getDate() + 7)
        break
      case 'next-14':
        end.setDate(end.getDate() + 14)
        break
      case 'this-week':
        // Get start of week (Sunday)
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        // Get end of week (Saturday)
        end = new Date(start)
        end.setDate(end.getDate() + 6)
        break
      case 'custom':
        return // Don't update range yet
    }

    end.setHours(23, 59, 59, 999)
    onChange({ start, end })
  }

  const handleCustomRange = () => {
    if (!customStart || !customEnd) {
      alert('Please select both start and end dates')
      return
    }

    const start = new Date(customStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(customEnd)
    end.setHours(23, 59, 59, 999)

    if (start > end) {
      alert('Start date must be before end date')
      return
    }

    setActivePreset('custom')
    onChange({ start, end })
  }

  return (
    <div className="date-range-selector">
      <div className="date-range-buttons">
        <button
          className={`date-range-button ${activePreset === 'next-7' ? 'active' : ''}`}
          onClick={() => handlePreset('next-7')}
        >
          Next 7 Days
        </button>
        <button
          className={`date-range-button ${activePreset === 'next-14' ? 'active' : ''}`}
          onClick={() => handlePreset('next-14')}
        >
          Next 14 Days
        </button>
        <button
          className={`date-range-button ${activePreset === 'this-week' ? 'active' : ''}`}
          onClick={() => handlePreset('this-week')}
        >
          This Week
        </button>
      </div>

      <div className="custom-range">
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          placeholder="Start date"
        />
        <span>to</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          placeholder="End date"
        />
        <button onClick={handleCustomRange}>Apply</button>
      </div>
    </div>
  )
}
