import { redirect } from "next/navigation"

// Root URL redirects to login.
// Once logged in, login page redirects to /user/my-cases
export default function RootPage() {
  redirect("/login")
}
