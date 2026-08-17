import { listMockups } from "@/lib/mockups";
import { MockupGallery } from "@/components/MockupGallery";

export default function HomePage() {
  const mockups = listMockups();
  return <MockupGallery mockups={mockups} />;
}
