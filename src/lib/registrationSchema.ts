import { z } from "zod";

export const registrationSchema = z.object({
  name: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(25, "Nama maksimal 25 karakter"),
  email: z
    .string()
    .email("Format email tidak valid (contoh: user@gmail.com)"),
  username: z
    .string()
    .regex(/^[a-zA-Z]+$/, "Username hanya boleh berupa huruf")
    .max(10, "Username maksimal 10 karakter"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar (A-Z)")
    .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil (a-z)")
    .regex(/[0-9]/, "Password harus mengandung minimal 1 angka (0-9)")
    .regex(/[@$!%*?&]/, "Password harus mengandung minimal 1 simbol khusus (@$!%*?&)")
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

export interface PasswordCriteria {
  minLength: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

export function evaluatePasswordStrength(password: string): {
  score: "weak" | "medium" | "strong";
  percentage: number;
  label: string;
  color: string;
  barColor: string;
  criteria: PasswordCriteria;
} {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const validCount = Object.values(criteria).filter(Boolean).length;

  if (password.length === 0) {
    return {
      score: "weak",
      percentage: 0,
      label: "Belum Diisi",
      color: "text-slate-400",
      barColor: "bg-slate-300",
      criteria,
    };
  }

  // Strong: Min 8 chars & ALL 4 combinations (Upper, Lower, Digit, Special)
  if (criteria.minLength && criteria.upper && criteria.lower && criteria.digit && criteria.special) {
    return {
      score: "strong",
      percentage: 100,
      label: "Strong (Kuat)",
      color: "text-emerald-500",
      barColor: "bg-emerald-500",
      criteria,
    };
  }

  // Medium: Has length >= 8 with uppercase + digits (or at least 3 valid criteria)
  if (password.length >= 8 && ((criteria.upper && criteria.digit) || validCount >= 3)) {
    return {
      score: "medium",
      percentage: 65,
      label: "Medium (Sedang)",
      color: "text-amber-500",
      barColor: "bg-amber-500",
      criteria,
    };
  }

  // Weak: Length < 8 or only 1-2 variations
  return {
    score: "weak",
    percentage: 30,
    label: "Weak (Lemah)",
    color: "text-rose-500",
    barColor: "bg-rose-500",
    criteria,
  };
}
