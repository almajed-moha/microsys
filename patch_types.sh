#!/bin/bash
sed -i 's/date: string;/date: string;\n  time?: string;/' src/types.ts
