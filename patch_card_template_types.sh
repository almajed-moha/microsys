#!/bin/bash
sed -i 's/showFooterBanner\?: boolean;/showFooterBanner?: boolean;\n  showPrintDate?: boolean;\n  borderColor?: string;/' src/types.ts
