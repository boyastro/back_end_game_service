# Terraform resource for AWS API Gateway WebSocket API (production-ready example)

resource "aws_apigatewayv2_api" "websocket_api" {
  name                       = "my-websocket-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_stage" "websocket_stage" {
  api_id      = aws_apigatewayv2_api.websocket_api.id
  name        = "prod"
  auto_deploy = true
}


# $connect route
resource "aws_apigatewayv2_integration" "connect_integration" {
  api_id             = aws_apigatewayv2_api.websocket_api.id
  integration_type   = "HTTP"
  integration_method = "POST"
  # Request template: luôn gửi JSON hợp lệ về backend (nếu cần)
  request_templates = {
    "application/json" = <<EOF
#if($input.body)
{ "body": $input.body }
#else
#end
EOF
  }
  integration_uri    = "http://54.179.50.108:30081/websocket/connect"
}

resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "$connect"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
  # Route $connect sẽ nhận request từ API Gateway khi client connect WebSocket
}

# $disconnect route
resource "aws_apigatewayv2_integration" "disconnect_integration" {
  api_id             = aws_apigatewayv2_api.websocket_api.id
  integration_type   = "HTTP"
  integration_method = "POST"
  request_templates = {
    "application/json" = <<EOF
#if($input.body)
{ "body": $input.body }
#else
{}
#end
EOF
  }
  integration_uri    = "http://54.179.50.108:30081/websocket/disconnect"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "$disconnect"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect_integration.id}"
}

# $default route
resource "aws_apigatewayv2_integration" "default_integration" {
  api_id             = aws_apigatewayv2_api.websocket_api.id
  integration_type   = "HTTP"
  integration_method = "POST"
  request_templates = {
    "application/json" = <<EOF
#if($input.body)
{ "body": $input.body }
#else
{}
#end
EOF
  }
  integration_uri    = "http://54.179.50.108:30081/websocket/default"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "$default"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.default_integration.id}"
}

# joinRoom route
resource "aws_apigatewayv2_integration" "join_room_integration" {
  api_id             = aws_apigatewayv2_api.websocket_api.id
  integration_type   = "HTTP"
  integration_method = "POST"
  request_templates = {
    "application/json" = <<EOF
#if($input.body)
{ "body": $input.body }
#else
{}
#end
EOF
  }
  integration_uri    = "http://54.179.50.108:30081/websocket/joinRoom"
}

resource "aws_apigatewayv2_route" "join_room" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "joinRoom"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.join_room_integration.id}"
}

# sendMessage route
resource "aws_apigatewayv2_integration" "send_message_integration" {
  api_id             = aws_apigatewayv2_api.websocket_api.id
  integration_type   = "HTTP"
  integration_method = "POST"
  request_templates = {
    "application/json" = <<EOF
#if($input.body)
{ "body": $input.body }
#else
{}
#end
EOF
  }
  integration_uri    = "http://54.179.50.108:30081/websocket/sendMessage"
}

resource "aws_apigatewayv2_route" "send_message" {
  api_id    = aws_apigatewayv2_api.websocket_api.id
  route_key = "sendMessage"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.send_message_integration.id}"
}

output "websocket_api_endpoint" {
  value = aws_apigatewayv2_api.websocket_api.api_endpoint
}
