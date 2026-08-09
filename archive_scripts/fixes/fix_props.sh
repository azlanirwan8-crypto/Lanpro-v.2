sed -i -e 's/userRole={userRole}/userRole={effectiveRole}/g' src/App.tsx
sed -i -e 's/userRole={userRole!}/userRole={effectiveRole}/g' src/App.tsx
sed -i -e 's/userRole={userRole as any}/userRole={effectiveRole}/g' src/App.tsx
