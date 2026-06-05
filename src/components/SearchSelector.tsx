import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SelectedValue {
  id?: string;
  name: string;
  flag?: string;
  team?: string;
}

interface SearchSelectorProps {
  placeholder: string;
  value: SelectedValue | null;
  onChange: (val: SelectedValue | null) => void;
  type: 'players' | 'teams';
  competition: 'WC' | 'CL';
  disabled?: boolean;
}

export const SearchSelector: React.FC<SearchSelectorProps> = ({
  placeholder,
  value,
  onChange,
  type,
  competition,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch results when query is >= 3 characters
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const endpoint = `/api/${type}/search?q=${encodeURIComponent(query.trim())}&competition=${competition}`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (err) {
        console.error(`Error searching ${type}:`, err);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query, type, competition]);

  const handleSelect = (item: any) => {
    onChange({
      id: item.id || item.name.toLowerCase().replace(/\s+/g, '_'),
      name: item.name,
      flag: item.flag || '🏳️',
      team: item.team || undefined,
    });
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {value ? (
        // Selected Item view
        <div className="flex items-center justify-between border border-primary/40 bg-primary/10 p-3 sm:px-4 rounded-none transition-colors">
          <div className="flex items-center gap-3">
            {value.flag && (
              value.flag.startsWith('http') ? (
                <img src={value.flag} className="w-5 h-5 object-contain" alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl leading-none">{value.flag}</span>
              )
            )}
            <div className="flex flex-col">
              <span className="text-[12px] font-black uppercase text-white tracking-wider">
                {value.name}
              </span>
              {value.team && (
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  {value.team}
                </span>
              )}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        // Search Input view
        <div className="relative">
          <input
            type="text"
            placeholder={disabled ? "No seleccionado (Plazo cerrado)" : placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className="w-full border border-border bg-[#0B0F19] text-[12px] font-bold uppercase tracking-wider text-white px-10 py-3 rounded-none focus:outline-none focus:border-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/50"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 3 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto border border-border bg-[#0E1322] shadow-[0_4px_24px_rgba(0,0,0,0.6)] rounded-none">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground font-black uppercase tracking-widest">
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground font-black uppercase tracking-widest">
              No se encontraron coincidencias
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-primary/25 border-b border-white/5 transition-colors"
              >
                {item.flag && (
                  item.flag.startsWith('http') ? (
                    <img src={item.flag} className="w-5 h-5 object-contain" alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl leading-none">{item.flag}</span>
                  )
                )}
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase text-white tracking-widest">
                    {item.name}
                  </span>
                  {item.team && (
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      {item.team}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
      {isOpen && query.trim().length > 0 && query.trim().length < 3 && (
        <div className="absolute z-50 mt-1 w-full border border-border bg-[#0E1322] p-3 text-center text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
          Escribe al menos 3 letras para buscar
        </div>
      )}
    </div>
  );
};
