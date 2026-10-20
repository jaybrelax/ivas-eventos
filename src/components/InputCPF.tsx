"use client";

import { useState } from "react";
import { mascararCpf } from "@/lib/cpf";

/** Campo de CPF que formata enquanto digita: 000.000.000-00. */
export function InputCPF({
  defaultValue,
  className = "campo",
  placeholder = "000.000.000-00",
  ...rest
}: { defaultValue?: string | null } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type">) {
  const [valor, setValor] = useState(mascararCpf(defaultValue ?? ""));
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete={rest.autoComplete ?? "off"}
      maxLength={14}
      placeholder={placeholder}
      className={className}
      value={valor}
      onChange={(e) => setValor(mascararCpf(e.target.value))}
    />
  );
}
