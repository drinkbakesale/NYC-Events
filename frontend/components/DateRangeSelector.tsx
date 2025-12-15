'use client'

import { useState, useEffect } from 'react'

interface DateRangeSelectorProps {
  dateRange: { start: Date; end: Date }
  onChange: (range: { start: Date; end: Date }) => void
}

type PresetRange = 'next-7' | 'next-14' | 'this-week' | 'custom'

export default function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  const [activePreset, setActivePreset] = useState<PresetRange>('next-7')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Sync activePreset with the actual dateRange to keep button highlighting correct
  useEffect(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Calculate what each preset's date range would be
    const next7End = new Date(now)
    next7End.setDate(next7End.getDate() + 7)
    next7End.setHours(23, 59, 59, 999)

    const next14End = new Date(now)
    next14End.setDate(next14End.getDate() + 14)
    next14End.setHours(23, 59, 59, 999)

    const thisWeekStart = new Date(now)
    const dayOfWeek = thisWeekStart.getDay()
    thisWeekStart.setDate(thisWeekStart.getDate() - dayOfWeek)
    const thisWeekEnd = new Date(thisWeekStart)
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 6)
    thisWeekEnd.setHours(23, 59, 59, 999)

    // Check which preset matches the current dateRange
    const rangeStart = dateRange.start.getTime()
    const rangeEnd = dateRange.end.getTime()

    if (Math.abs(rangeStart - now.getTime()) < 1000 && Math.abs(rangeEnd - next7End.getTime()) < 1000) {
      setActivePreset('next-7')
    } else if (Math.abs(rangeStart - now.getTime()) < 1000 && Math.abs(rangeEnd - next14End.getTime()) < 1000) {
      setActivePreset('next-14')
    } else if (Math.abs(rangeStart - thisWeekStart.getTime()) < 1000 && Math.abs(rangeEnd - thisWeekEnd.getTime()) < 1000) {
      setActivePreset('this-week')
    } else {
      setActivePreset('custom')
    }
  }, [dateRange])

  const handlePreset = (preset: PresetRange) => {
    // Clear custom dates when clicking preset buttons
    setCustomStart('')
    setCustomEnd('')
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
    }

    end.setHours(23, 59, 59, 999)
    onChange({ start, end })
  }

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart)
      start.setHours(0, 0, 0, 0)
      const end = new Date(customEnd)
      end.setHours(23, 59, 59, 999)

      if (start <= end) {
        setActivePreset('custom')
        onChange({ start, end })
      }
    }
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
        <button onClick={handleApplyCustomRange} disabled={!customStart || !customEnd}>
          Apply
        </button>
      </div>
    </div>
  )
}
