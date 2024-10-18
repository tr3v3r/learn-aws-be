import * as mockProducts from './mocks/products.json';

export async function main(event: any, _context: any, callback: any) {
  const productId = event.productId;
 
  const product = mockProducts.find((product: any) => product.id === productId);

  if(!product) {
    return callback(new Error('Product not found'));
  }

  return callback(null, product);
  }