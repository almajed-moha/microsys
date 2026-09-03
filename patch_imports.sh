#!/bin/bash
sed -i 's/NetworkSettings/NetworkSettings, CardTemplate/' src/components/MikrotikLiveView.tsx
sed -i 's/CardCategory,/CardCategory, CardTemplate,/' src/components/UserManagerView.tsx
