import { useState, useEffect } from 'react';

const JsonConfigArea = ({ value, onChange, label = "Config (JSON)" }) => {
    // Initialize text state from props
    const [text, setText] = useState(value ? JSON.stringify(value, null, 2) : '');
    const [error, setError] = useState(null);
  
    // Update text when value prop changes externally (e.g. loading data)
    useEffect(() => {
        if (value === undefined || value === null) {
            if (text !== '') setText(''); // Only clear if not already clear/typing
        } else {
             // Check if the current text parses to the same value to avoid cursor jumps or re-renders if possible
             // For simplicity, we just update if they are structurally different or if text is empty but value exists
             try {
                 const currentParsed = text ? JSON.parse(text) : null;
                 if (JSON.stringify(currentParsed) !== JSON.stringify(value)) {
                     setText(JSON.stringify(value, null, 2));
                 }
             } catch (e) {
                 // If current text is invalid JSON, don't overwrite it with valid JSON from props 
                 // unless we explicitly want to reset (which usually happens via key change or parent reset)
                 // But here, let's trust the prop if it changes.
                 setText(JSON.stringify(value, null, 2));
             }
        }
    }, [value]);

    const handleChange = (e) => {
      const newText = e.target.value;
      setText(newText);
      if (!newText.trim()) {
          onChange(null);
          setError(null);
          return;
      }
      try {
          const parsed = JSON.parse(newText);
          onChange(parsed);
          setError(null);
      } catch (err) {
          setError("Invalid JSON");
      }
    };
  
    return (
      <div className="mt-2">
        <label className="block font-bold text-xs uppercase mb-1">{label}</label>
        <textarea 
          className={`neo-input font-mono text-xs ${error ? 'border-neo-error focus:shadow-[5px_5px_0px_0px_#f87171]' : ''}`}
          rows={4}
          value={text}
          onChange={handleChange}
          placeholder="{}"
        />
        {error && <span className="text-neo-error text-xs font-bold block mt-1">{error}</span>}
      </div>
    );
};

export default JsonConfigArea;

