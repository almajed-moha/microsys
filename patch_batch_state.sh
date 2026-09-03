#!/bin/bash
sed -i 's/const \[batchPrefix, setBatchPrefix\] = useState<string>('"'"'u'"'"');/const [batchPrefix, setBatchPrefix] = useState<string>('"'"'u'"'"');\n  const [batchTemplateId, setBatchTemplateId] = useState<string>('"'"''"'"');/' src/components/UserManagerView.tsx
