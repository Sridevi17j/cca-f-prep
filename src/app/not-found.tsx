import Link from "next/link";

export default function NotFound() {
  return (
    <section className="notice">
      <h1>Page not found.</h1>
      <Link className="button" href="/">
        Back
      </Link>
    </section>
  );
}
