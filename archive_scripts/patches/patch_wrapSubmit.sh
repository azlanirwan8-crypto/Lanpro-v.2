sed -i -e '/const scrollRef = useRef<HTMLDivElement>(null);/a\
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});\
\
  const wrapSubmit = (key: string, fn: () => Promise<void> | void) => async () => {\
    setIsSubmitting(prev => ({ ...prev, [key]: true }));\
    try {\
      await fn();\
    } finally {\
      setIsSubmitting(prev => ({ ...prev, [key]: false }));\
    }\
  };' src/features/issues/TaskDetailModal.tsx
