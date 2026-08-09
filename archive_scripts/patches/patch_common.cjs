const fs = require('fs');
let code = fs.readFileSync('src/components/ui/CommonComponents.tsx', 'utf8');

const oldInput = `export const UncontrolledInput = ({ initialValue, onSave, placeholder, className, disabled, type = "text", ...rest }: any) => {
  const [val, setVal] = React.useState(initialValue || "");
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

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
        if (val !== initialValue) onSave(val);
      }}
      disabled={disabled}
      {...rest}
    />
  );
};`;

const newInput = `export const UncontrolledInput = ({ initialValue, onSave, onAutoSave, placeholder, className, disabled, type = "text", ...rest }: any) => {
  const [val, setVal] = React.useState(initialValue || "");
  const [isFocused, setIsFocused] = React.useState(false);
  const saveTimeout = React.useRef<any>(null);

  React.useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  React.useEffect(() => {
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

code = code.replace(oldInput, newInput);
fs.writeFileSync('src/components/ui/CommonComponents.tsx', code);
