const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = '// --- Utils ---';
const endMarker = 'const AuthHeroPanel = () => (';

const startIndex = appContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = appContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = appContent.substring(startIndex, endIndex);
    
    const newUIFile = `import React, { useRef, useEffect } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

` + chunk.replace(/const cn =/g, "export const cn =").replace(/const ensureDate =/g, "export const ensureDate =").replace(/const safeFormat =/g, "export const safeFormat =").replace(/const TimelineDatePills =/g, "export const TimelineDatePills =").replace(/const Button =/g, "export const Button =").replace(/const Input =/g, "export const Input =").replace(/const Textarea =/g, "export const Textarea =").replace(/const GoogleIcon =/g, "export const GoogleIcon =").replace(/const VelzonFloatingParticles =/g, "export const VelzonFloatingParticles =") + `
`;

    fs.writeFileSync('src/components/ui/CoreUI.tsx', newUIFile);

    const importStatement = `import { cn, ensureDate, safeFormat, TimelineDatePills, Button, Input, Textarea, GoogleIcon, VelzonFloatingParticles } from "./components/ui/CoreUI";\n`;
    
    // Find where to insert import: after the last import in App.tsx
    // Or we can just insert it before startMarker
    appContent = appContent.substring(0, startIndex) + importStatement + appContent.substring(endIndex);
    fs.writeFileSync('src/App.tsx', appContent);
    console.log("CoreUI extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
