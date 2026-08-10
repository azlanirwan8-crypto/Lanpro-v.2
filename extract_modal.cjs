const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = 'const ProfileEditModal = ({';
const endMarker = 'const BROWSER_SESSION_ID = ';

const startIndex = appContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = appContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = appContent.substring(startIndex, endIndex);
    
    // Create src/features/users if it doesn't exist
    if (!fs.existsSync('src/features/users')) {
      fs.mkdirSync('src/features/users', { recursive: true });
    }

    const newModalFile = `import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button, Input } from "../../components/ui/CoreUI";
import { apiRequest } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { UserProfile } from "../../lib/types";

` + chunk.replace(/const ProfileEditModal =/g, "export const ProfileEditModal =") + `
`;

    fs.writeFileSync('src/features/users/ProfileEditModal.tsx', newModalFile);

    const importStatement = `import { ProfileEditModal } from "./features/users/ProfileEditModal";\n`;
    
    appContent = appContent.substring(0, startIndex) + importStatement + appContent.substring(endIndex);
    fs.writeFileSync('src/App.tsx', appContent);
    console.log("ProfileEditModal extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
