import { notFound } from "next/navigation";
import { getMockupConfig, listMockupSlugs } from "@/lib/mockups";
import { Editor } from "@/components/Editor/Editor";

export function generateStaticParams() {
  return listMockupSlugs().map((slug) => ({ slug }));
}

export default function MockupPage({ params }: { params: { slug: string } }) {
  const config = getMockupConfig(params.slug);
  if (!config) notFound();
  return <Editor config={config} />;
}
