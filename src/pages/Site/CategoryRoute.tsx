import { useParams, Navigate } from "react-router-dom";
import { getCategoryBySlug } from "@/data/categories";
import { CategoryLandingTemplate } from "@/components/category/CategoryLandingTemplate";
import CategoryPage from "./CategoryPage";
import SportsCategoryPage from "./SportsCategoryPage";

/**
 * Renders any category by slug.
 * - "agro" and "esportivos" use their pre-existing rich pages (preserves bespoke content).
 * - All other slugs use the reusable CategoryLandingTemplate driven by data/categories.ts.
 */
export default function CategoryRoute() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/" replace />;

  const category = getCategoryBySlug(slug);
  if (!category) return <Navigate to="/" replace />;

  if (slug === "agro") return <CategoryPage />;
  if (slug === "esportivos") return <SportsCategoryPage />;

  return <CategoryLandingTemplate category={category} />;
}
