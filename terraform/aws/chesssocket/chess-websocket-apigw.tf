# chess-websocket-apigw.tf
# Triển khai AWS API Gateway WebSocket cho game chess

resource "aws_apigatewayv2_api" "chess_ws_api" {
  name                       = "chess-ws-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
  description                = "WebSocket API cho game chess online"
}

# Default $connect, $disconnect, $default routes
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.chess_ws_api.id
  route_key = "$connect"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.chess_ws_api.id
  route_key = "$disconnect"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect_integration.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.chess_ws_api.id
  route_key = "$default"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.default_integration.id}"
}

# Các route cho sự kiện game chess
resource "aws_apigatewayv2_route" "join" {
  api_id    = aws_apigatewayv2_api.chess_ws_api.id
  route_key = "join"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.join_integration.id}"
}

resource "aws_apigatewayv2_route" "move" {
  api_id    = aws_apigatewayv2_api.chess_ws_api.id
  route_key = "move"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.move_integration.id}"
}

resource "aws_apigatewayv2_route" "restart" {
  api_id    = aws_apigatewayv2_api.chess_ws_api.id
  route_key = "restart"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.restart_integration.id}"
}

resource "aws_apigatewayv2_route" "leave" {
  api_id    = aws_apigatewayv2_api.chess_ws_api.id
  route_key = "leave"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.leave_integration.id}"
}

# Integration mẫu (bạn cần thay thế URI endpoint thực tế Lambda hoặc HTTP backend)
resource "aws_apigatewayv2_integration" "connect_integration" {
  api_id           = aws_apigatewayv2_api.chess_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/chess/connect"
}
resource "aws_apigatewayv2_integration" "disconnect_integration" {
  api_id           = aws_apigatewayv2_api.chess_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/chess/disconnect"
}
resource "aws_apigatewayv2_integration" "default_integration" {
  api_id           = aws_apigatewayv2_api.chess_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/chess/default"
}
resource "aws_apigatewayv2_integration" "join_integration" {
  api_id           = aws_apigatewayv2_api.chess_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/chess/join"
}
resource "aws_apigatewayv2_integration" "move_integration" {
  api_id           = aws_apigatewayv2_api.chess_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/chess/move"
}
resource "aws_apigatewayv2_integration" "restart_integration" {
  api_id           = aws_apigatewayv2_api.chess_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/chess/restart"
}
resource "aws_apigatewayv2_integration" "leave_integration" {
  api_id           = aws_apigatewayv2_api.chess_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/chess/leave"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.chess_ws_api.id
  name        = "prod"
  auto_deploy = true
}

output "chess_websocket_api_endpoint" {
  value = aws_apigatewayv2_api.chess_ws_api.api_endpoint
}
