import { AttributeValue } from "@aws-sdk/client-dynamodb";
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
