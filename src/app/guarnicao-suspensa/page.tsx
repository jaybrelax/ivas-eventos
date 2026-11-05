import { redirect } from "next/navigation";

/** Links antigos da suspensão agora levam ao aplicativo normal. */
export default function GuarnicaoSuspensa() {
  redirect("/guarnicao");
}
