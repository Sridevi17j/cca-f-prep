import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "./icons";

export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Image src="/logo-icon.png" alt="" width={36} height={40} priority />
        PiHive
      </Link>
      <nav aria-label="Sections">
        <Link href="/#banks">Practice</Link>
        <Link href="/#about">About</Link>
      </nav>
      <a className="header-link" href="mailto:sridevi@pihivetech.com">
        Talk to us
        <ArrowIcon />
      </a>
    </header>
  );
}
