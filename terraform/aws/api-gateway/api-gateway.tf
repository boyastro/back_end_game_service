resource "aws_api_gateway_rest_api" "myapi" {
  name        = "my-k3s-api"
  description = "API Gateway for k3s Node.js app"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.myapi.id
  parent_id   = aws_api_gateway_rest_api.myapi.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.myapi.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.myapi.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method
  type        = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri         = "http://54.179.50.108:30081/{proxy}"
  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}


resource "aws_api_gateway_deployment" "myapi" {
  depends_on = [aws_api_gateway_integration.proxy]
  rest_api_id = aws_api_gateway_rest_api.myapi.id
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.myapi.id
  deployment_id = aws_api_gateway_deployment.myapi.id
  stage_name    = "prod"
}
