import { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import localDB from '../services/db';
import { useAuth } from '../contexts/AuthContext';

/**
 * StationAutocomplete Component
 * 
 * Reusable station search and selection component with:
 * - Debounced search by name or code
 * - Online API + offline IndexedDB fallback
 * - Keyboard navigation (↑↓ Enter Escape)
 * - Explicit selection required (no auto-fill)
 * - Mobile-friendly design
 * - Zone/Division display
 * 
 * Props:
 * - value: string - Current station value (code or name)
 * - onChange: (station) => void - Called when station is selected
 *   - station: { code, name, zone, division } or null
 * - onInputChange: (inputText) => void - Called when input changes
 * - placeholder: string - Input placeholder
 * - disabled: boolean - Disable input
 * - required: boolean - HTML required attribute
 * - className: string - Additional CSS classes
 * - label: string - Form label
 * - showClearButton: boolean - Show clear selection button
 */
const StationAutocomplete = ({
  value = '',
  onChange,
  onInputChange,
  placeholder = 'Search station name or code...',
  disabled = false,
  required = false,
  className = '',
  label = '',
  showClearButton = true
}) => {
  const { isOnline } = useAuth();
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync input value when value prop changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
      setSelectedStation(null);
    }
  }, [value]);

  // Search stations (online or offline)
  const searchStations = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      let results = [];

      if (isOnline) {
        // Try online search first
        try {
          const data = await api.stations.search(query);
          results = data.stations || [];
        } catch (apiError) {
          console.warn('Online station search failed, falling back to cache:', apiError);
          results = await searchCachedStations(query);
        }
      } else {
        // Offline: search cached stations
        results = await searchCachedStations(query);
      }

      setSuggestions(results.slice(0, 10)); // Limit to 10 results
      setIsOpen(results.length > 0);
    } catch (err) {
      console.error('Station search error:', err);
      setError('Failed to search stations');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Search cached stations in IndexedDB
  const searchCachedStations = async (query) => {
    try {
      await localDB.init();
      const allStations = await localDB.getAll('stations');
      const lowerQuery = query.toLowerCase();

      return allStations.filter(station =>
        station.name.toLowerCase().includes(lowerQuery) ||
        station.code.toLowerCase().includes(lowerQuery)
      );
    } catch (err) {
      console.error('Cached station search failed:', err);
      return [];
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedStation(null);
    setSelectedIndex(-1);

    if (onInputChange) {
      onInputChange(newValue);
    }

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search (300ms)
    debounceTimerRef.current = setTimeout(() => {
      searchStations(newValue);
    }, 300);
  };

  // Handle station selection
  const handleSelectStation = (station) => {
    setInputValue(station.name);
    setSelectedStation(station);
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);

    if (onChange) {
      onChange(station);
    }
  };

  // Handle clear selection
  const handleClear = () => {
    setInputValue('');
    setSelectedStation(null);
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);

    if (onChange) {
      onChange(null);
    }

    if (onInputChange) {
      onInputChange('');
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectStation(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSuggestions([]);
        setSelectedIndex(-1);
        break;

      default:
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(e.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSuggestions([]);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`position-relative ${className}`}>
      {label && (
        <label className="form-label-saas">{label}</label>
      )}

      <div className="position-relative">
        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          className={`form-control form-control-saas ${selectedStation ? 'border-success' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
        />

        {/* Icons */}
        <div className="position-absolute" style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px', alignItems: 'center' }}>
          {loading && (
            <Loader size={16} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
          )}

          {selectedStation && (
            <MapPin size={16} className="text-success" />
          )}

          {showClearButton && inputValue && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-link p-0 text-secondary-custom"
              style={{ lineHeight: 1 }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Selected Station Info */}
      {selectedStation && (
        <div className="d-flex align-items-center gap-2 mt-2">
          <span className="badge" style={{ fontSize: '11px', backgroundColor: '#E0F2FE', border: '1px solid #BAE6FD', color: '#0C4A6E' }}>
            {selectedStation.code}
          </span>
          {selectedStation.zone && (
            <span className="badge" style={{ fontSize: '11px', backgroundColor: '#DBEAFE', border: '1px solid #BAE6FD', color: '#0EA5E9' }}>
              {selectedStation.zone}
            </span>
          )}
          {selectedStation.division && (
            <span className="badge" style={{ fontSize: '11px', backgroundColor: '#F0F9FF', border: '1px solid #DBEAFE', color: '#64748B' }}>
              {selectedStation.division}
            </span>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="d-flex align-items-center gap-1 mt-2 text-danger" style={{ fontSize: '12px' }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && inputValue && (
        <div className="mt-1" style={{ fontSize: '11px', color: '#64748B' }}>
          Searching offline cache...
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="card-saas position-absolute w-100 mt-1"
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            zIndex: 1050,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #DBEAFE'
          }}
        >
          {suggestions.map((station, index) => (
            <div
              key={station.code}
              className={`p-3 cursor-pointer`}
              style={{
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: index === selectedIndex ? '#F0F9FF' : '#FFFFFF',
                borderBottom: index < suggestions.length - 1 ? '1px solid #DBEAFE' : 'none'
              }}
              onClick={() => handleSelectStation(station)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#0C4A6E' }}>
                  {station.name}
                </span>
                <span className="badge" style={{ fontSize: '11px', backgroundColor: '#E0F2FE', border: '1px solid #BAE6FD', color: '#0C4A6E' }}>
                  {station.code}
                </span>
              </div>

              <div className="d-flex align-items-center gap-2">
                {station.zone && (
                  <span className="badge" style={{ fontSize: '10px', backgroundColor: '#DBEAFE', border: '1px solid #BAE6FD', color: '#0EA5E9' }}>
                    {station.zone}
                  </span>
                )}
                {station.division && (
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {station.division}
                  </span>
                )}
                {station.stationType && station.stationType !== 'REGULAR' && (
                  <span className="badge" style={{ fontSize: '10px', backgroundColor: '#F0F9FF', border: '1px solid #DBEAFE', color: '#64748B' }}>
                    {station.stationType}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && !loading && inputValue.length >= 2 && suggestions.length === 0 && (
        <div className="card-saas position-absolute w-100 mt-1 p-3 text-center" style={{ zIndex: 1050, border: '1px solid #DBEAFE' }}>
          <AlertCircle size={20} className="mx-auto mb-2" style={{ color: '#94A3B8' }} />
          <p className="mb-0" style={{ fontSize: '13px', color: '#64748B' }}>
            No stations found for "{inputValue}"
          </p>
          {isOnline && (
            <p className="mb-0" style={{ fontSize: '11px', color: '#94A3B8' }}>
              Try searching by station code or full name
            </p>
          )}
          {!isOnline && (
            <p className="mb-0" style={{ fontSize: '11px', color: '#F59E0B' }}>
              Offline: Searching cached stations only
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StationAutocomplete;
