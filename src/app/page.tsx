import { redirect } from "next/navigation";

// Root → always send to login
export default function RootPage() {
  redirect("/login");
}
