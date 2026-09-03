import React, { InputHTMLAttributes, useState, useEffect } from 'react';
import { parseLocalizedNumber } from '../utils/numbers';

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (numericValue: number | '') => void;
}

export function NumericInput({ value, onChange, className, ...props }: NumericInputProps) {
  const [localValue, setLocalValue] = useState<string>(value === 0 && props.placeholder ? '' : value.toString());

  useEffect(() => {
    if (value !== undefined && value !== null) {
       // Only update local value if it differs numerically to avoid overriding while typing (like "1.")
       const parsedLocal = parseFloat(localValue);
       const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
       if (parsedLocal !== parsedValue && !(isNaN(parsedLocal) && isNaN(parsedValue))) {
         setLocalValue(value === 0 && props.placeholder ? '' : value.toString());
       }
    }
  }, [value, props.placeholder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;
    
    // Parse Arabic/Persian and remove non-numeric chars (except .)
    let parsedString = parseLocalizedNumber(rawValue);
    
    setLocalValue(parsedString); // Allows keeping "1." while typing
    
    if (parsedString === '') {
      onChange('');
    } else {
      const num = parseFloat(parsedString);
      onChange(isNaN(num) ? '' : num);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={localValue}
      onChange={handleChange}
      {...props}
    />
  );
}
