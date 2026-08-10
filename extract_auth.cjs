const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = 'const AuthHeroPanel = () => (';
const endMarker = 'const ProfileEditModal = ({';

const startIndex = appContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = appContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = appContent.substring(startIndex, endIndex);
    
    // Create src/features/auth if it doesn't exist
    if (!fs.existsSync('src/features/auth')) {
      fs.mkdirSync('src/features/auth', { recursive: true });
    }

    const newAuthFile = `import React, { useState, useEffect } from "react";
import { LogIn, Lock, Activity, Users, FileText, Bot, ArrowRight, UserPlus, Fingerprint, RefreshCcw, Eye, EyeOff, Building, MapPin, Building2, User, Phone, Briefcase, Mail } from "lucide-react";
import { Button, Input, VelzonFloatingParticles, GoogleIcon, AuthWatermarkPattern } from "../../components/ui/CoreUI";
import api from "../../lib/api";

` + chunk.replace(/const AuthHeroPanel =/g, "export const AuthHeroPanel =").replace(/const AuthWatermarkPattern =/g, "export const AuthWatermarkPattern =").replace(/const RegisterScreen =/g, "export const RegisterScreen =").replace(/const LoginSkeletonState =/g, "export const LoginSkeletonState =").replace(/const LoginScreen =/g, "export const LoginScreen =") + `
`;

    // Wait, VelzonFloatingParticles and AuthWatermarkPattern are used here. 
    // Is AuthWatermarkPattern extracted?
    // Let's check chunk. If chunk contains AuthWatermarkPattern, then it's in AuthScreens, NOT CoreUI.
    // If it's in AuthScreens, we don't import it from CoreUI.
    let importsFromCoreUI = ["Button", "Input", "VelzonFloatingParticles", "GoogleIcon"];
    let finalAuthFile = newAuthFile.replace("AuthWatermarkPattern", ""); // remove from import just in case

    fs.writeFileSync('src/features/auth/AuthScreens.tsx', finalAuthFile);

    const importStatement = `import { AuthHeroPanel, AuthWatermarkPattern, RegisterScreen, LoginSkeletonState, LoginScreen } from "./features/auth/AuthScreens";\n`;
    
    appContent = appContent.substring(0, startIndex) + importStatement + appContent.substring(endIndex);
    fs.writeFileSync('src/App.tsx', appContent);
    console.log("AuthScreens extracted successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
