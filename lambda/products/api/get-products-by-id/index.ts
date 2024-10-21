import { getProducts } from "/opt/nodejs/get-products";
import { Product } from "../../../types";

export async function main(event: { productId: string }) {
  const productId = event.productId;
  const mockProducts = getProducts() as Product[];

  const product = mockProducts.find(
    (product: Product) => product.id === productId,
  );

  if (!product) {
    return new Error("Product not found");
  }

  return product;
}
