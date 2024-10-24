import { main } from "../index";
import { Product } from "../../../../types";

const mockProducts = [] as Product[];

jest.mock(
  "/opt/nodejs/get-products",
  () => ({
    getProducts: jest.fn(() => mockProducts),
  }),
  {
    virtual: true,
  },
);

describe("get-products", () => {
  it("should return the correct products", async () => {
    const result = await main();
    expect(result).toBe(mockProducts);
  });
});
