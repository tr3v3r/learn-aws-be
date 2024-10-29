import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const ProductsTableName = "Products";
const StocksTableName = "Stocks";
export class LambdasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productTable = new dynamodb.Table(this, "Products", {
      tableName: ProductsTableName,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "createdAt",
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    const stockTable = new dynamodb.Table(this, "Stocks", {
      tableName: StocksTableName,
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "createdAt",
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    const lambdaUtilsLayer = new lambda.LayerVersion(
      this,
      "lambda-utils-layer",
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../layers/lambda-utils"),
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      },
    );

    const getProductsFunction = new lambda.Function(
      this,
      "get-products-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "index.main",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/products/api/get-products"),
        ),
        layers: [lambdaUtilsLayer],
        environment: {
          PRODUCTS_TABLE_NAME: ProductsTableName,
          STOCKS_TABLE_NAME: StocksTableName,
        },
      },
    );

    const getProductByIdFunction = new lambda.Function(
      this,
      "get-product-by-id-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "index.main",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/products/api/get-products-by-id"),
        ),
        layers: [lambdaUtilsLayer],
        environment: {
          PRODUCTS_TABLE_NAME: ProductsTableName,
          STOCKS_TABLE_NAME: StocksTableName,
        },
      },
    );

    const createProductFunction = new lambda.Function(
      this,
      "create-product-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "index.main",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/products/api/create-product"),
        ),
        layers: [lambdaUtilsLayer],
        environment: {
          PRODUCTS_TABLE_NAME: ProductsTableName,
          STOCKS_TABLE_NAME: StocksTableName,
        },
      },
    );

    productTable.grantWriteData(createProductFunction);
    stockTable.grantWriteData(createProductFunction);

    const api = new apigateway.RestApi(this, "my-api", {
      restApiName: "My API Gateway",
      description: "This API serves the Lambda functions.",
    });

    const getProductsFunctionIntegration = new apigateway.LambdaIntegration(
      getProductsFunction,
      {
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin":
                "'https://d1qy3wei893duj.cloudfront.net'",
            },
          },
          {
            statusCode: "500",
            selectionPattern: "Internal server error",
          },
        ],
        proxy: false,
      },
    );

    const getProductByIdFunctionIntegration = new apigateway.LambdaIntegration(
      getProductByIdFunction,
      {
        requestTemplates: {
          "application/json": `{ "productId": "$method.request.path.product_id" }`,
        },
        integrationResponses: [
          {
            statusCode: "200",
          },
          {
            statusCode: "404",
            selectionPattern: "Product not found",
          },
          {
            statusCode: "500",
            selectionPattern: "Internal server error",
          },
        ],
        proxy: false,
      },
    );

    const createProductFunctionIntegration = new apigateway.LambdaIntegration(
      createProductFunction,
      {
        integrationResponses: [
          {
            statusCode: "200",
          },
          {
            statusCode: "400",
            selectionPattern: "Invalid product data",
          },
          {
            statusCode: "500",
            selectionPattern: "Internal server error",
          },
        ],
        proxy: false,
      },
    );

    const productsResource = api.root.addResource("products", {
      defaultCorsPreflightOptions: {
        allowOrigins: ["https://d1qy3wei893duj.cloudfront.net"],
        allowMethods: ["GET", "POST"],
      },
    });
    const productsByIdResource = productsResource.addResource("{product_id}");

    productsResource.addMethod("GET", getProductsFunctionIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });
    productsByIdResource.addMethod("GET", getProductByIdFunctionIntegration, {
      methodResponses: [
        { statusCode: "200" },
        { statusCode: "404" },
        { statusCode: "500" },
      ],
    });

    productsResource.addMethod("POST", createProductFunctionIntegration, {
      methodResponses: [
        { statusCode: "200" },
        { statusCode: "400" },
        { statusCode: "500" },
      ],
    });
  }
}
