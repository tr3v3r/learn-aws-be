import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SQS_QUEUE_ARN } from "./constants";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

const bucketName = "ImoportServiceBucket";
const uploadFolderName = "uploaded";
const parsedFolderName = "parsed";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const catalogItemsQueue = new sqs.Queue(this, "catalog-items-queue");

    const basicAuthorizerArn = cdk.Fn.importValue("BasicAuthorizerFunctionArn");

    const basicAuthorizer = lambda.Function.fromFunctionAttributes(
      this,
      "BasicAuthorizerFunction",
      {
        functionArn: basicAuthorizerArn,
        sameEnvironment: true,
      },
    );

    new StringParameter(this, "catalog-items-queue-arn", {
      parameterName: SQS_QUEUE_ARN,
      stringValue: catalogItemsQueue.queueArn,
    });

    const importBucket = new s3.Bucket(this, bucketName, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["https://d1qy3wei893duj.cloudfront.net"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    const importProductsFileFunction = new lambda.Function(
      this,
      "imoiport-products-file-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "index.main",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/import/api/import-products-file"),
        ),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          UPLOAD_FOLDER_NAME: uploadFolderName,
        },
      },
    );

    const importFileParserFunction = new lambda.Function(
      this,
      "import-file-parser-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "index.main",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/import/api/import-file-parser"),
        ),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          UPLOAD_FOLDER_NAME: uploadFolderName,
          PARSED_FOLDER_NAME: parsedFolderName,
          SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
        },
      },
    );

    importBucket.grantReadWrite(importFileParserFunction);
    importBucket.grantReadWrite(importProductsFileFunction);
    catalogItemsQueue.grantSendMessages(importFileParserFunction);

    importBucket.addObjectCreatedNotification(
      new s3n.LambdaDestination(importFileParserFunction),
      { prefix: uploadFolderName },
    );

    const api = new apigateway.RestApi(this, "import-api-gateway", {
      restApiName: "Import API Gateway",
      description: "This API serves the Lambda functions.",
    });

    const authorizer = new apigateway.TokenAuthorizer(
      this,
      "import-authorizer",
      {
        handler: basicAuthorizer,
        identitySource: apigateway.IdentitySource.header("Authorization"),
      },
    );

    const importProductsFileFunctionIntergration =
      new apigateway.LambdaIntegration(importProductsFileFunction, {
        requestTemplates: {
          "application/json": `{ "fileName": "$input.params('filename')" }`,
        },
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
      });

    const importProductResource = api.root.addResource("import", {
      defaultCorsPreflightOptions: {
        allowOrigins: ["https://d1qy3wei893duj.cloudfront.net"],
        allowMethods: ["GET"],
      },
    });

    importProductResource.addMethod(
      "GET",
      importProductsFileFunctionIntergration,
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      },
    );
  }
}
