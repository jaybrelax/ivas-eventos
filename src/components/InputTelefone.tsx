"use client";

import { useState } from "react";
import { mascararTelefone } from "@/lib/telefone";

/** Campo de telefone que formata enquanto digita: (43) 99999-0000. */
export function InputTelefone({
  defaultValue,
  className = "campo",
  placeholder = "(43) 99999-0000",
  ...rest
}: { defaultValue?: string | null } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type">) {
  const [valor, setValor] = useState(mascararTelefone(defaultValue ?? ""));
  return (
    <input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete={rest.autoComplete ?? "tel"}
      maxLength={15}
      placeholder={placeholder}
      className={className}
      value={valor}
      onChange={(e) => setValor(mascararTelefone(e.target.value))}
    />
  );
}
