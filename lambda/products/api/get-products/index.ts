import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

import { getFullProductsData } from "/opt/nodejs/lambda-utils";
import { Product } from "../../../types";

const ProductsTableName = process.env.PRODUCTS_TABLE_NAME;
const StocksTableName = process.env.STOCKS_TABLE_NAME;
const client = new DynamoDBClient({ region: "us-east-1" }); // Change region as needed

async function getAllProductsFromDB(): Promise<Product[]> {
  const productsScanCommand = new ScanCommand({ TableName: ProductsTableName });
  const StocksScanCommand = new ScanCommand({ TableName: StocksTableName });

  const tableResponse = await client.send(productsScanCommand);
  const stockResponse = await client.send(StocksScanCommand);

  return getFullProductsData(
    tableResponse.Items || [],
    stockResponse.Items || [],
  );
}

export async function main() {
  try {
    const products = await getAllProductsFromDB();

    return products;
  } catch (e) {
    console.log(e);
    return Promise.reject("Internal server error");
  }
}
