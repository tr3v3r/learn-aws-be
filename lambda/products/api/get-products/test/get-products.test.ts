import { main } from '../index';


const mockProducts = [] as any[];

jest.mock('/opt/nodejs/get-products', () => ({
  getProducts: jest.fn(() => mockProducts),
}), {
  virtual: true
})

describe('get-products', () => {
  let callback: jest.Mock;

  beforeEach(() => {
    callback = jest.fn();
  });

  it('should return the correct products', async () => {
   const result =  await main();
    expect(result).toBe(mockProducts);
  });
});