#!/bin/bash
sed -i 's/const \[categories, setCategories\] = useState<CardCategory\[\]>(() =>/const [templates, setTemplates] = useState<CardTemplate[]>(() => {\n    const saved = localStorage.getItem('"'"'mikrotik_templates'"'"');\n    return saved ? JSON.parse(saved) : [];\n  });\n\n  useEffect(() => {\n    localStorage.setItem('"'"'mikrotik_templates'"'"', JSON.stringify(templates));\n  }, [templates]);\n\n  const [categories, setCategories] = useState<CardCategory[]>(() =>/g' src/App.tsx

sed -i 's/<MikrotikLiveView/<MikrotikLiveView\n                  templates={templates}\n                  onSaveTemplate={(t) => {\n                    const exists = templates.find((x) => x.id === t.id);\n                    if (exists) setTemplates(templates.map((x) => (x.id === t.id ? t : x)));\n                    else setTemplates([...templates, t]);\n                  }}\n                  onDeleteTemplate={(id) => setTemplates(templates.filter((x) => x.id !== id))}/g' src/App.tsx

