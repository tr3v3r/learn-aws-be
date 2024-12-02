#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ProductServiceStack } from "../lib/product-service-stack";
import { ImportServiceStack } from "../lib/import-service-stack";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";

const app = new cdk.App();

new AuthorizationServiceStack(app, "AuthorizationServiceStack", {});
new ImportServiceStack(app, "ImportServiceStack", {});
new ProductServiceStack(app, "LambdasStack", {});
