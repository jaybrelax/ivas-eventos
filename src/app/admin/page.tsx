import { redirect } from "next/navigation";
import { exigir } from "@/lib/auth";

export default async function Inicio() {
  await exigir();
  redirect("/admin/eventos");
}
