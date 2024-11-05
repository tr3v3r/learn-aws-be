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

describe("get-products", () => {
  const mockProducts = [
    { id: "1", name: "Product 1" },
    { id: "2", name: "Product 2" },
  ] as unknown as Product[];

  const mockStocks = [
    { productId: "1", stock: 10 },
    { productId: "2", stock: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the products when found", async () => {
    const mockSend = jest.spyOn(DynamoDBClient.prototype, "send");
    // @ts-expect-error as we are mocking the send method
    mockSend.mockResolvedValueOnce({ Items: mockProducts });
    // @ts-expect-error as we are mocking the send method
    mockSend.mockResolvedValueOnce({ Items: mockStocks });

    (getFullProductsData as jest.Mock).mockReturnValue(mockProducts);

    const res = await main();

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(getFullProductsData).toHaveBeenCalledWith(mockProducts, mockStocks);
    expect(res).toEqual(mockProducts);
  });

  it("should return an error when there is an exception", async () => {
    const mockSend = jest.spyOn(DynamoDBClient.prototype, "send");
    // @ts-expect-error as we are mocking the send method
    mockSend.mockRejectedValueOnce(new Error("DynamoDB error"));

    try {
      await main();
    } catch (e) {
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(e).toEqual("Internal server error");
    }
  });
});
