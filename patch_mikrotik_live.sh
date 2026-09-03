#!/bin/bash
sed -i 's/categories\?: CardCategory\[\];/categories?: CardCategory[];\n  templates?: CardTemplate[];\n  onSaveTemplate?: (t: CardTemplate) => void;\n  onDeleteTemplate?: (id: string) => void;/' src/components/MikrotikLiveView.tsx

sed -i 's/  categories = \[\],/  categories = [],\n  templates = [],\n  onSaveTemplate,\n  onDeleteTemplate,/' src/components/MikrotikLiveView.tsx

sed -i 's/categories={categories}/categories={categories}\n          templates={templates}\n          onSaveTemplate={onSaveTemplate}\n          onDeleteTemplate={onDeleteTemplate}/g' src/components/MikrotikLiveView.tsx
