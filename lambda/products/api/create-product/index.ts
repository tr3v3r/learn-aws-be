import {
  DynamoDBClient,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";

import { Product } from "../../../types";
import { generateProductId } from "/opt/nodejs/lambda-utils";

const ProductsTableName = process.env.PRODUCTS_TABLE_NAME;
const StocksTableName = process.env.STOCKS_TABLE_NAME;
const client = new DynamoDBClient({ region: "us-east-1" }); // Change region as needed

function isProductValid(product: Omit<Product, "id">) {
  if (
    typeof product.price !== "number" ||
    product.price <= 0 ||
    typeof product.count !== "number" ||
    typeof product.description !== "string" ||
    typeof product.title !== "string"
  ) {
    return false;
  }

  return true;
}

export async function main(
  event: Omit<Product, "id">,
): Promise<{ id: string }> {
  try {
    console.log("Arguments:", event);

    const { price, count, description, title } = event;

    if (!isProductValid(event)) {
      return Promise.reject("Invalid product data");
    }

    const productId = generateProductId();
    const createdAt = new Date().getTime().toFixed();

    const transactCommand = new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: ProductsTableName,
            Item: {
              id: { S: productId },
              title: { S: title },
              description: { S: description },
              price: { N: price.toString() },
              createdAt: { N: createdAt },
            },
          },
        },
        {
          Put: {
            TableName: StocksTableName,
            Item: {
              product_id: { S: productId },
              count: { N: count.toString() },
              createdAt: { N: createdAt },
            },
          },
        },
      ],
    });

    await client.send(transactCommand);

    return {
      id: productId,
    };
  } catch (error) {
    console.log(error);
    return Promise.reject("Internal server error");
  }
}
