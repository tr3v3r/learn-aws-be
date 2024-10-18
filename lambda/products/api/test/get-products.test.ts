import { main } from '../get-products';
import * as mockProducts from '../mocks/products.json';

// Import necessary modules and functions

describe('get-products', () => {
  let callback: jest.Mock;

  beforeEach(() => {
    callback = jest.fn();
  });

  it('should return the correct products', async () => {
    await main({}, {}, callback);
    expect(callback).toHaveBeenCalledWith(null, mockProducts);
  });

  it('should call the callback with the correct arguments', async () => {
    await main({}, {}, callback);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(null, mockProducts);
  });
});