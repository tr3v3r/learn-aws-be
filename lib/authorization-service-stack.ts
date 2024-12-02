import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";

import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

import { Construct } from "constructs";

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizerFunction = new lambda.Function(
      this,
      "basic-authorizer-function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "index.main",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/authorization/basicAuthorizer"),
        ),
      },
    );

    new CfnOutput(this, "basic-authorizer-function-output", {
      value: basicAuthorizerFunction.functionArn,
      exportName: "BasicAuthorizerFunctionArn",
    });
  }
}
