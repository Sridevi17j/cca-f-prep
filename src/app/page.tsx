import { HomeExperience } from "@/components/HomeExperience";
import { getCatalog } from "@/lib/catalog";

export default function HomePage() {
  const catalog = getCatalog();
  return <HomeExperience catalog={catalog} />;
}
