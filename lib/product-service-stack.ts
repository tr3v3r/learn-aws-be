import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { SQS_QUEUE_ARN } from "./constants";

const ProductsTableName = "Products";
const StocksTableName = "Stocks";
export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "catalog-items-queue",
      StringParameter.valueForStringParameter(this, SQS_QUEUE_ARN),
    );

    const createProductTopic = new sns.Topic(this, "product-created-topic");

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

    const catalogBatchProcessFunction = new lambda.Function(
      this,
      "catalog-batch-process-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "index.main",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/products/api/catalog-batch-process"),
        ),
        layers: [lambdaUtilsLayer],
        environment: {
          PRODUCTS_TABLE_NAME: ProductsTableName,
          STOCKS_TABLE_NAME: StocksTableName,
          SNS_TOPIC_ARN: createProductTopic.topicArn,
        },
      },
    );

    productTable.grantWriteData(catalogBatchProcessFunction);
    stockTable.grantWriteData(catalogBatchProcessFunction);

    catalogBatchProcessFunction.addEventSource(
      new SqsEventSource(catalogItemsQueue, { batchSize: 5 }),
    );

    const subscription = new subscriptions.EmailSubscription(
      process.env.SNS_SUBSCRIPTION_EMAIL as string,
      {
        filterPolicy: {
          title: sns.SubscriptionFilter.stringFilter({
            matchSuffixes: ["1"],
          }),
        },
      },
    );

    createProductTopic.addSubscription(subscription);

    createProductTopic.grantPublish(catalogBatchProcessFunction);

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
