import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <section className="not-found page-shell">
      <p className="eyebrow">404</p>
      <h1>That page is not on the desk.</h1>
      <Link className="button button-dark" href="/">
        Back to the banks
        <ArrowIcon />
      </Link>
    </section>
  );
}
