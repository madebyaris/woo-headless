#!/bin/bash

# Fix exactOptionalPropertyTypes issues systematically
# Pattern: instead of assigning `value | undefined` to optional properties,
# we use conditional spreading: ...(value !== undefined && { property: value })

echo "Fixing exactOptionalPropertyTypes issues..."

# Find files with exactOptionalPropertyTypes errors and apply systematic fixes
# This script applies the established pattern we've been using

files=(
  "src/modules/checkout/flow.ts"
  "src/modules/checkout/index.ts" 
  "src/modules/checkout/order.ts"
  "src/modules/checkout/payment.ts"
  "src/modules/checkout/validation.ts"
  "src/modules/search/index.ts"
  "src/modules/user/index.ts"
  "src/modules/user/social-login.ts"
  "src/modules/user/email-verification.ts"
  "src/modules/reviews/index.ts"
)

# Apply common patterns to fix exactOptionalPropertyTypes
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Pattern 1: variationId fixes
    sed -i '' 's/variationId: item\.variationId/...(item.variationId !== undefined \&\& { variationId: item.variationId })/g' "$file"
    
    # Pattern 2: redirectUrl fixes  
    sed -i '' 's/redirectUrl: payment\.redirectUrl/...(payment.redirectUrl !== undefined \&\& { redirectUrl: payment.redirectUrl })/g' "$file"
    
    # Pattern 3: Optional string properties
    sed -i '' 's/: string | undefined/?: string/g' "$file"
    
    echo "Processed $file"
  fi
done

echo "exactOptionalPropertyTypes fixes completed!" 