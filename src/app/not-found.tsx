import Link from "next/link";

export default function NotFound() {
  return (
    <section className="notice">
      <h1>We couldn’t find that page.</h1>
      <Link className="button" href="/">
        Back home
      </Link>
    </section>
  );
}
