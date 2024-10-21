import { getProducts } from '/opt/nodejs/get-products';


export async function main(event: any) {
  const productId = event.productId;
  const mockProducts = getProducts();
 
  const product = mockProducts.find((product: any) => product.id === productId);

  if(!product) {
    return new Error('Product not found')
  }

  return product
  }