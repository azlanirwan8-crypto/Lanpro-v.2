sed -i -e '/const \[isQuickCreateOpen, setIsQuickCreateOpen\] = useState(false);/a\
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});\
\
  const wrapAppSubmit = (key: string, fn: () => Promise<void> | void) => async () => {\
    setIsSubmitting(prev => ({ ...prev, [key]: true }));\
    try {\
      await fn();\
    } finally {\
      setIsSubmitting(prev => ({ ...prev, [key]: false }));\
    }\
  };' src/App.tsx
