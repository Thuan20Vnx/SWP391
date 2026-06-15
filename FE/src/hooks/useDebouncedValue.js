import { useEffect, useState } from 'react';

const useDebouncedValue = (value, delayMs = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

export default useDebouncedValue;
