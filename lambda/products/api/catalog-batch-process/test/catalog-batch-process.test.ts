import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SNSClient } from "@aws-sdk/client-sns";
import { main } from "../index";
import {
  createProductDBCommand,
  isProductValid,
} from "/opt/nodejs/lambda-utils";
import { Product } from "../../../../types";

jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/client-sns");
jest.mock(
  "/opt/nodejs/lambda-utils",
  () => ({
    createProductDBCommand: jest.fn(() => ({ command: "command", id: "1" })),
    isProductValid: jest.fn(() => true),
  }),
  {
    virtual: true,
  },
);

describe("catalog-batch-process", () => {
  const mockProduct: Product = {
    id: "1",
    title: "Product 1",
    description: "Description 1",
    price: 20,
    count: 5,
  };

  const mockEvent: SQSEvent = {
    Records: [
      {
        body: JSON.stringify([mockProduct]),
      },
    ],
  } as unknown as SQSEvent;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process valid products successfully", async () => {
    (isProductValid as jest.Mock).mockReturnValue(true);
    (createProductDBCommand as jest.Mock).mockReturnValue({
      command: {},
      id: "1",
    });

    const mockSend = jest
      .spyOn(DynamoDBClient.prototype, "send")
      // @ts-expect-error testing purposes
      .mockResolvedValue({});
    const mockPublish = jest
      .spyOn(SNSClient.prototype, "send")
      // @ts-expect-error testing purposes
      .mockResolvedValue({});

    await main(mockEvent);

    expect(isProductValid).toHaveBeenCalledWith(
      expect.objectContaining(mockProduct),
    );
    expect(createProductDBCommand).toHaveBeenCalledWith({
      data: expect.objectContaining(mockProduct),
      productsTableName: process.env.PRODUCTS_TABLE_NAME,
      stocksTableName: process.env.STOCKS_TABLE_NAME,
    });
    expect(mockSend).toHaveBeenCalled();
    expect(mockPublish).toHaveBeenCalled();
  });

  it("should reject invalid product data", async () => {
    (isProductValid as jest.Mock).mockReturnValue(false);

    await expect(main(mockEvent)).rejects.toEqual("Invalid product data");

    expect(isProductValid).toHaveBeenCalledWith(
      expect.objectContaining(mockProduct),
    );
    expect(createProductDBCommand).not.toHaveBeenCalled();
  });
});
