import { useState } from 'react';

const formatJsonValue = (value) => {
    if (value === undefined || value === null) return '';
    return JSON.stringify(value, null, 2);
};

const JsonConfigArea = ({ value, onChange, label = "Config (JSON)" }) => {
    const [draft, setDraft] = useState(() => formatJsonValue(value));
    const [isDirty, setIsDirty] = useState(false);
    const [error, setError] = useState(null);

    const text = isDirty ? draft : formatJsonValue(value);

    const handleChange = (e) => {
      const newText = e.target.value;
            setDraft(newText);
            setIsDirty(true);
      if (!newText.trim()) {
          onChange(null);
          setError(null);
          return;
      }
      try {
          const parsed = JSON.parse(newText);
          onChange(parsed);
          setError(null);
            } catch {
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
                    onBlur={() => {
                        if (!error) {
                            setIsDirty(false);
                            setDraft(formatJsonValue(value));
                        }
                    }}
          placeholder="{}"
        />
        {error && <span className="text-neo-error text-xs font-bold block mt-1">{error}</span>}
      </div>
    );
};

export default JsonConfigArea;

