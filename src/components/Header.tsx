import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Image src="/logo-icon.png" alt="" width={22} height={24} priority />
        PiHive
      </Link>
      <a className="header-link" href="https://pihivetech.com">
        pihivetech.com
      </a>
    </header>
  );
}
