import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

import { Product } from "../../../types";
import {
  createProductDBCommand,
  isProductValid,
} from "/opt/nodejs/lambda-utils";

const ProductsTableName = process.env.PRODUCTS_TABLE_NAME;
const StocksTableName = process.env.STOCKS_TABLE_NAME;
const SnsTopiArn = process.env.SNS_TOPIC_ARN;
const client = new DynamoDBClient({ region: "us-east-1" }); // Change region as needed
const snsClient = new SNSClient({ region: "us-east-1" });
export async function main(event: SQSEvent) {
  try {
    const products = JSON.parse(event.Records[0].body) as Product[];

    const createdProducts: string[] = [];

    for (const product of products) {
      const processedProduct = {
        ...product,
        count: Number(product.count),
        price: Number(product.price),
      };

      if (!isProductValid(processedProduct)) {
        return Promise.reject("Invalid product data");
      }

      const { command, id } = createProductDBCommand({
        data: processedProduct,
        productsTableName: ProductsTableName as string,
        stocksTableName: StocksTableName as string,
      });

      await client.send(command);

      const snsCommand = new PublishCommand({
        TopicArn: SnsTopiArn,
        Message: JSON.stringify({
          id: id,
          text: "Object with price more then 10 created",
        }),
        MessageAttributes: {
          title: {
            DataType: "String",
            StringValue: processedProduct.title,
          },
        },
      });

      await snsClient.send(snsCommand);

      createdProducts.push(id);
    }
  } catch (e) {
    console.log("Error:", e);
  }
}
