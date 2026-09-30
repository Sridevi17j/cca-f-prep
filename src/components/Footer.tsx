import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <div className="footer-inner page-shell">
        <Link href="/" className="brand footer-brand">
          <Image src="/logo-icon.png" alt="" width={29} height={32} />
          PiHive
        </Link>
        <p>
          <a href="https://pihivetech.com" target="_blank" rel="noreferrer">
            Virtual AI products, built from Chennai
          </a>
        </p>
        <p>© 2026 PiHive Technologies</p>
      </div>
    </footer>
  );
}
