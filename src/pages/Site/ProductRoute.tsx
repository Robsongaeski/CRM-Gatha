import { useParams, Navigate } from "react-router-dom";
import { products } from "@/data/products";
import ProductPage from "./ProductPage";

const ProductRoute = () => {
  const { slug } = useParams<{ slug: string }>();
  const product = products.find((p) => p.slug === slug) ?? products[0];
  if (!product) return <Navigate to="/" replace />;
  return <ProductPage product={product} />;
};

export default ProductRoute;
