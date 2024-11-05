import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

import { getFullProductsData } from "/opt/nodejs/lambda-utils";
import { Product } from "../../../types";

const ProductsTableName = process.env.PRODUCTS_TABLE_NAME;
const StocksTableName = process.env.STOCKS_TABLE_NAME;
const client = new DynamoDBClient({ region: "us-east-1" }); // Change region as needed

async function getProductByIdFromDB(
  productId: string,
): Promise<Product | null> {
  console.log("Arguments:", { productId });

  const productCommand = new QueryCommand({
    TableName: ProductsTableName,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": { S: productId },
    },
  });

  const stockCommand = new QueryCommand({
    TableName: StocksTableName,
    KeyConditionExpression: "product_id = :id",
    ExpressionAttributeValues: {
      ":id": { S: productId },
    },
  });
  const productResponse = await client.send(productCommand);
  const stockResponse = await client.send(stockCommand);

  if (!productResponse.Items?.length || !stockResponse.Items?.length) {
    return null;
  }

  return getFullProductsData(
    productResponse.Items || [],
    stockResponse.Items || [],
  )[0];
}

export async function main(event: { productId: string }) {
  try {
    const productId = event.productId;
    const product = await getProductByIdFromDB(productId);

    if (!product) {
      return Promise.reject("Product not found");
    }

    return product;
  } catch (e) {
    console.log(e);
    return Promise.reject("Internal server error");
  }
}
