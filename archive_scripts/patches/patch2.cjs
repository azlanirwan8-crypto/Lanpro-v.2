const fs = require('fs');
let code = fs.readFileSync('src/features/issues/TaskDetailModal.tsx', 'utf8');

const regexInput = /const UncontrolledInput = \({[\s\S]*?disabled={disabled}\s*{...rest}\s*\/>\s*\);\s*};/m;
const regexTextarea = /const UncontrolledTextarea = \({[\s\S]*?else onCancel\(\);\s*}\s*}\s*\/>\s*\);\s*};/m;

const newInput = `const UncontrolledInput = ({ initialValue, onSave, onAutoSave, placeholder, className, disabled, type = "text", ...rest }: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (onAutoSave) onAutoSave(val);
        else onSave(val);
      }, 1000);
    }
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [val, isFocused, initialValue, onAutoSave, onSave]);

  return (
    <input 
      type={type}
      className={className}
      placeholder={placeholder}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onBlur={() => {
        setIsFocused(false);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        if (val !== initialValue) onSave(val);
      }}
      disabled={disabled}
      {...rest}
    />
  );
};`;

const newTextarea = `const UncontrolledTextarea = ({ initialValue, onSave, onCancel, onAutoSave, placeholder, className, rows = 3 }: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (onAutoSave) onAutoSave(val);
        else onSave(val);
      }, 1000);
    }
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [val, isFocused, initialValue, onAutoSave, onSave]);

  return (
    <textarea 
      className={className}
      placeholder={placeholder}
      rows={rows}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      autoFocus
      onFocus={() => setIsFocused(true)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (saveTimeout.current) clearTimeout(saveTimeout.current);
          if (val !== initialValue) onSave(val);
          else onCancel();
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        if (val !== initialValue) onSave(val);
        else onCancel();
      }}
    />
  );
};`;

code = code.replace(regexInput, newInput);
code = code.replace(regexTextarea, newTextarea);

fs.writeFileSync('src/features/issues/TaskDetailModal.tsx', code);
