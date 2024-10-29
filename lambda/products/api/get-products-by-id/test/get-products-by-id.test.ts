import { main } from "../index";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getFullProductsData } from "/opt/nodejs/lambda-utils";
import { Product } from "../../../../types";

jest.mock(
  "/opt/nodejs/lambda-utils",
  () => {
    return {
      getFullProductsData: jest.fn(),
    };
  },
  {
    virtual: true,
  },
);

describe("get-products-by-id", () => {
  const mockProduct = { id: "1", name: "Product 1" } as unknown as Product;
  const mockStock = { productId: "1", stock: 10 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the product when found", async () => {
    const mockSend = jest.spyOn(DynamoDBClient.prototype, "send");
    // @ts-expect-error as we are mocking the send method
    mockSend.mockResolvedValueOnce({ Items: [mockProduct] });
    // @ts-expect-error as we are mocking the send method
    mockSend.mockResolvedValueOnce({ Items: [mockStock] });

    (getFullProductsData as jest.Mock).mockReturnValue([mockProduct]);

    const res = await main({ productId: "1" });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(getFullProductsData).toHaveBeenCalledWith(
      [mockProduct],
      [mockStock],
    );
    expect(res).toEqual(mockProduct);
  });

  it("should return an error when product is not found", async () => {
    const mockSend = jest.spyOn(DynamoDBClient.prototype, "send");
    // @ts-expect-error as we are mocking the send method
    mockSend.mockResolvedValueOnce({ Items: [] });
    // @ts-expect-error as we are mocking the send method
    mockSend.mockResolvedValueOnce({ Items: [] });

    try {
      await main({ productId: "1" });
    } catch (e) {
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(e).toEqual("Product not found");
    }
  });

  it("should return an error when there is an exception", async () => {
    const mockSend = jest.spyOn(DynamoDBClient.prototype, "send");
    // @ts-expect-error as we are mocking the send method
    mockSend.mockRejectedValueOnce(new Error("DynamoDB error"));

    try {
      await main({ productId: "1" });
    } catch (e) {
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(e).toEqual("Internal server error");
    }
  });
});
