import * as mockProducts from './mocks/products.json';

export async function main(_event: any, _context: any, callback: any) {
  return callback(null, mockProducts);   
}