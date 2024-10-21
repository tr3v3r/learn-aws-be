import { main } from '../index';

const mockProducts = [{ id: '1', name: 'Product 1' }, { id: '2', name: 'Product 2' }] as any[];

jest.mock('/opt/nodejs/get-products', () => ({
  getProducts: jest.fn(() => mockProducts),
}), {
  virtual: true
})

describe('get-products-by-id', () => {
  it('should return the product when found', async () => {
    const event = { productId: '1' };

    const res = await main(event);

    expect(res).toEqual({ id: '1', name: 'Product 1' })
  });

  it('should return an error when the product is not found', async () => {
    const event = { productId: '3' };

    const res =  await main(event);

    expect(res).toEqual(new Error('Product not found'));
  });
});