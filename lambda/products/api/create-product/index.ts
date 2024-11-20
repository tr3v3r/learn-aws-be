import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { Product } from "../../../types";
import {
  createProductDBCommand,
  isProductValid,
} from "/opt/nodejs/lambda-utils";

const ProductsTableName = process.env.PRODUCTS_TABLE_NAME;
const StocksTableName = process.env.STOCKS_TABLE_NAME;
const client = new DynamoDBClient({ region: "us-east-1" }); // Change region as needed

export async function main(
  event: Omit<Product, "id">,
): Promise<{ id: string }> {
  try {
    console.log("Arguments:", event);

    if (!isProductValid(event)) {
      return Promise.reject("Invalid product data");
    }

    const { command, id } = createProductDBCommand({
      data: event,
      productsTableName: ProductsTableName as string,
      stocksTableName: StocksTableName as string,
    });

    await client.send(command);

    return {
      id: id,
    };
  } catch (error) {
    console.log(error);
    return Promise.reject("Internal server error");
  }
}
