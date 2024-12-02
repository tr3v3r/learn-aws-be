import {
  AttributeValue,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

import { Product, ProductDTO, StockDTO } from "../../../lambda/types";

export function getFullProductsData(
  productsItems: Record<string, AttributeValue>[],
  stocksItems: Record<string, AttributeValue>[],
): Product[] {
  const stockItemsMap = stocksItems.reduce(
    (acc, item) => {
      const unmarshalledItem = unmarshall(item) as StockDTO;
      acc[unmarshalledItem.product_id] = unmarshalledItem;
      return acc;
    },
    {} as Record<string, StockDTO>,
  );

  return (
    productsItems.map((product) => {
      const unmarshalledProduct = unmarshall(product) as ProductDTO;

      return {
        id: unmarshalledProduct.id,
        title: unmarshalledProduct.title,
        description: unmarshalledProduct.description,
        price: unmarshalledProduct.price,
        count: stockItemsMap?.[unmarshalledProduct.id]?.count ?? 0,
      };
    }) || []
  );
}

export function generateProductId() {
  return uuidv4();
}

export function isProductValid(product: Omit<Product, "id">) {
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

export function createProductDBCommand({
  data,
  productsTableName,
  stocksTableName,
}: {
  data: Omit<Product, "id">;
  productsTableName: string;
  stocksTableName: string;
}): {
  command: TransactWriteItemsCommand;
  id: string;
} {
  const { price, count, description, title } = data;

  const productId = generateProductId();
  const createdAt = new Date().getTime().toFixed();

  const transactCommand = new TransactWriteItemsCommand({
    TransactItems: [
      {
        Put: {
          TableName: productsTableName,
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
          TableName: stocksTableName,
          Item: {
            product_id: { S: productId },
            count: { N: count.toString() },
            createdAt: { N: createdAt },
          },
        },
      },
    ],
  });

  return { command: transactCommand, id: productId };
}
