import { main } from '../get-products-by-id';
import * as mockProducts from '../mocks/products.json';

// lambda/products/api/get-products-by-id.test.ts

jest.mock('../mocks/products.json', () => [
  { id: '1', name: 'Product 1' },
  { id: '2', name: 'Product 2' },
]);

describe('get-products-by-id', () => {
  it('should return the product when found', async () => {
    const event = { productId: '1' };
    const callback = jest.fn();

    await main(event, {}, callback);

    expect(callback).toHaveBeenCalledWith(null, { id: '1', name: 'Product 1' });
  });

  it('should return an error when the product is not found', async () => {
    const event = { productId: '3' };
    const callback = jest.fn();

    await main(event, {}, callback);

    expect(callback).toHaveBeenCalledWith(new Error('Product not found'));
  });
});