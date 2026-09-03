#!/bin/bash
sed -i 's/categories\?: CardCategory\[\];/categories?: CardCategory[];\n  templates?: CardTemplate[];\n  onSaveTemplate?: (t: CardTemplate) => void;\n  onDeleteTemplate?: (id: string) => void;/' src/components/UserManagerView.tsx

sed -i 's/categories = \[\],/categories = [],\n  templates = [],\n  onSaveTemplate,\n  onDeleteTemplate,/' src/components/UserManagerView.tsx

