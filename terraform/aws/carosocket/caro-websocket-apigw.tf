# caro-websocket-apigw.tf
# Triển khai AWS API Gateway WebSocket cho game caro

resource "aws_apigatewayv2_api" "caro_ws_api" {
  name                       = "caro-ws-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.type"
  description                = "WebSocket API cho game caro online"
}

# Default $connect, $disconnect, $default routes
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "$connect"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "$disconnect"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect_integration.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "$default"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.default_integration.id}"
}

# Các route cho sự kiện game caro
resource "aws_apigatewayv2_route" "join_room" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "joinRoom"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.join_room_integration.id}"
}

resource "aws_apigatewayv2_route" "start_game" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "startGame"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.start_game_integration.id}"
}

resource "aws_apigatewayv2_route" "make_move" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "makeMove"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.make_move_integration.id}"
}

resource "aws_apigatewayv2_route" "leave_room" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "leaveRoom"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.leave_room_integration.id}"
}

resource "aws_apigatewayv2_route" "game_over" {
  api_id    = aws_apigatewayv2_api.caro_ws_api.id
  route_key = "gameOver"
  authorization_type = "NONE"
  target    = "integrations/${aws_apigatewayv2_integration.game_over_integration.id}"
}

# Integration mẫu (bạn cần thay thế URI endpoint thực tế Lambda hoặc HTTP backend)
resource "aws_apigatewayv2_integration" "connect_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/connect"
}
resource "aws_apigatewayv2_integration" "disconnect_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/disconnect"
}
resource "aws_apigatewayv2_integration" "default_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/default"
}
resource "aws_apigatewayv2_integration" "join_room_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/join"
}
resource "aws_apigatewayv2_integration" "start_game_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/start"
}
resource "aws_apigatewayv2_integration" "make_move_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/move"
}
resource "aws_apigatewayv2_integration" "leave_room_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/leave"
}
resource "aws_apigatewayv2_integration" "game_over_integration" {
  api_id           = aws_apigatewayv2_api.caro_ws_api.id
  integration_type = "HTTP"
  integration_method = "POST"
  integration_uri  = "http://54.179.50.108:30081/caro/gameover"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.caro_ws_api.id
  name        = "prod"
  auto_deploy = true
}

output "caro_websocket_api_endpoint" {
  value = aws_apigatewayv2_api.caro_ws_api.api_endpoint
}
