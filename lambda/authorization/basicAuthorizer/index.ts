import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";

const credentials = process.env.CREDENTIALS as string;

export async function main(event: APIGatewayTokenAuthorizerEvent) {
  try {
    const token = event.authorizationToken;
    if (token) {
      const [, tokenValue] = token.split(" ");
      const decodedToken = Buffer.from(tokenValue, "base64").toString("utf-8");

      if (decodedToken === credentials) {
        return createPolicy("Allow", event.methodArn);
      } else {
        return createPolicy("Deny", event.methodArn, 403);
      }
    } else {
      return createPolicy("Deny", event.methodArn, 401);
    }
  } catch (e: unknown) {
    console.log(e);
    return Promise.reject("Unknown error");
  }
}
function createPolicy(
  effect: "Allow" | "Deny",
  resource: string,
  statusCode = 200,
): APIGatewayAuthorizerResult {
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      statusCode,
    },
  };
}
