import { notFound } from "next/navigation";
import { ImageFactoryAccess } from "@/components/image-factory/access";
import { ImageReviewDashboard } from "@/components/image-factory/dashboard";
import { hasImageFactorySession, isImageFactoryConfigured } from "@/lib/image-factory/operator.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Image Factory" };

export default async function ImageReviewPage() {
  if (!isImageFactoryConfigured()) notFound();
  return await hasImageFactorySession() ? <ImageReviewDashboard /> : <ImageFactoryAccess />;
}
