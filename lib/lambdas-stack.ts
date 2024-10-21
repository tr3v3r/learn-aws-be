import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
export class LambdasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsLayer = new lambda.LayerVersion(this, 'get-products-layer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../layers/get-products')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
    });

    const getProductsFunction = new lambda.Function(this, 'get-products-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'index.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/products/api/get-products')),
      layers: [getProductsLayer],
    });

    const getProductByIdFunction = new lambda.Function(this, 'get-product-by-id-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'index.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/products/api/get-products-by-id')),
      layers: [getProductsLayer],
    });

    const api = new apigateway.RestApi(this, "my-api", {
      restApiName: "My API Gateway",
      description: "This API serves the Lambda functions."
    });

    const getProductsFunctionIntegration = new apigateway.LambdaIntegration(getProductsFunction, {      
      integrationResponses: [
        {
          statusCode: '200',   
          responseParameters: {
              // "method.response.header.Access-Control-Allow-Methods": "GET",
              "method.response.header.Access-Control-Allow-Origin": "'https://d1qy3wei893duj.cloudfront.net'"
          }     
        },
      ],      
      proxy: false,
    });

    const getProductByIdFunctionIntegration = new apigateway.LambdaIntegration(getProductByIdFunction, {  
      requestTemplates: {
        "application/json":
          `{ "productId": "$method.request.path.product_id" }`
      },    
      integrationResponses: [
        {
          statusCode: '200',        
        },
        {
          
          statusCode: '404',
          selectionPattern: 'Product not found'
        }
      ],      
      proxy: false,
    });

    const productsResource = api.root.addResource("products", {
      defaultCorsPreflightOptions: {
        allowOrigins: [ 'https://d1qy3wei893duj.cloudfront.net' ],
        allowMethods: ['GET'],
      }
    });
    const productsByIdResource = productsResource.addResource("{product_id}");

    productsResource.addMethod('GET', getProductsFunctionIntegration, { methodResponses: [{ statusCode: '200', responseParameters: {
      "method.response.header.Access-Control-Allow-Methods":true,
      "method.response.header.Access-Control-Allow-Origin": true
    }}] });
    productsByIdResource.addMethod('GET', getProductByIdFunctionIntegration, { methodResponses: [{ statusCode: '200' }, { statusCode: '404'}] });   
  }
}
// responseParameters: {
//   "method.response.header.Access-Control-Allow-Headers": 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
// "method.response.header.Access-Control-Allow-Methods": 'GET',
// "method.response.header.Access-Control-Allow-Origin": 'https://d1qy3wei893duj.cloudfront.net'
//  } }