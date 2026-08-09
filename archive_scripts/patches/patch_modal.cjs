const fs = require('fs');
let code = fs.readFileSync('src/features/issues/TaskDetailModal.tsx', 'utf8');

const uncontrolledInputOld = `const UncontrolledInput = ({ initialValue, onSave, placeholder, className, disabled, type = "text", ...rest }: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
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

const uncontrolledInputNew = `const UncontrolledInput = ({ initialValue, onSave, onAutoSave, placeholder, className, disabled, type = "text", ...rest }: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && onAutoSave && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onAutoSave(val);
      }, 1000);
    }
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [val, isFocused, initialValue, onAutoSave]);

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

code = code.replace(uncontrolledInputOld, uncontrolledInputNew);

const uncontrolledTextareaOld = `const UncontrolledTextarea = ({ initialValue, onSave, onCancel, placeholder, className, rows = 3 }: any) => {
  const [val, setVal] = useState(initialValue || "");

  return (
    <textarea 
      className={className}
      placeholder={placeholder}
      rows={rows}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (val !== initialValue) onSave(val);
          else onCancel();
        }
      }}
      onBlur={() => {
        if (val !== initialValue) onSave(val);
        else onCancel();
      }}
    />
  );
};`;

const uncontrolledTextareaNew = `const UncontrolledTextarea = ({ initialValue, onSave, onCancel, onAutoSave, placeholder, className, rows = 3 }: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && onAutoSave && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onAutoSave(val);
      }, 1000);
    }
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [val, isFocused, initialValue, onAutoSave]);

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

code = code.replace(uncontrolledTextareaOld, uncontrolledTextareaNew);

// Now, we need to add onAutoSave prop to the actual calls in TaskDetailModal

// 1. UncontrolledInput for title
code = code.replace(/onSave={\(val: string\) => updateTaskField\(task.id, 'title', val\)}/, 
  "onSave={(val: string) => updateTaskField(task.id, 'title', val)}\n                    onAutoSave={(val: string) => updateTaskField(task.id, 'title', val)}");

// 2. DescriptionEditor for description
code = code.replace(/onSave={\(value\) => { updateTaskField\(task.id, 'description', value\); setIsEditingDescription\(false\); }}/,
  "onSave={(value) => { updateTaskField(task.id, 'description', value); setIsEditingDescription(false); }}\n                        onAutoSave={(value) => updateTaskField(task.id, 'description', value)}");

// 3. UncontrolledTextarea for acceptanceCriteria
code = code.replace(/onSave={\(val: string\) => {\n                              updateTaskField\(task.id, 'acceptanceCriteria', val\);\n                              setIsEditingAcceptanceCriteria\(false\);\n                          }}/,
  "onSave={(val: string) => {\n                              updateTaskField(task.id, 'acceptanceCriteria', val);\n                              setIsEditingAcceptanceCriteria(false);\n                          }}\n                          onAutoSave={(val: string) => updateTaskField(task.id, 'acceptanceCriteria', val)}");

// 4. UncontrolledInput for subtask title
code = code.replace(/onSave={\(val: string\) => updateTaskField\(st.id, 'title', val\)}/,
  "onSave={(val: string) => updateTaskField(st.id, 'title', val)}\n                          onAutoSave={(val: string) => updateTaskField(st.id, 'title', val)}");

fs.writeFileSync('src/features/issues/TaskDetailModal.tsx', code);
