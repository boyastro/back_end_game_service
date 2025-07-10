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

# Enable CORS for all methods and all origins
resource "aws_api_gateway_method_response" "proxy_cors" {
  rest_api_id = aws_api_gateway_rest_api.myapi.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "proxy_cors" {
  rest_api_id = aws_api_gateway_rest_api.myapi.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method
  status_code = aws_api_gateway_method_response.proxy_cors.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
  response_templates = {
    "application/json" = ""
  }
}


resource "aws_api_gateway_deployment" "myapi" {
  depends_on = [aws_api_gateway_integration.proxy, aws_api_gateway_integration_response.proxy_cors]
  rest_api_id = aws_api_gateway_rest_api.myapi.id
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.myapi.id
  deployment_id = aws_api_gateway_deployment.myapi.id
  stage_name    = "prod"
}
