import json
import numpy as np
import chess
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.utils import to_categorical

# Đọc dữ liệu từ games.json
with open('data/games_checkmate.json', 'r') as f:
    games = json.load(f)

# Tiền xử lý: lấy FEN và move


# Chuyển sang phân loại nước đi tốt/xấu
fen_list = []
move_list = []
move_quality_labels = []  # 1: tốt (dẫn đến thắng), 0: xấu (dẫn đến thua)
for game in games:
    if game.get('result') in ['1-0', '0-1'] and 'moves' in game:
        is_win = 1 if game.get('result') == '1-0' else 0
        for m in game['moves']:
            fen = m.get('fen')
            move = m.get('move')
            if fen and move:
                move_str = f"{move['from']['x']}{move['from']['y']}{move['to']['x']}{move['to']['y']}"
                fen_list.append(fen)
                move_list.append(move_str)
                move_quality_labels.append(is_win)



# Chuyển FEN thành ma trận 8x8, mỗi ô là số đại diện cho quân cờ
def fen_to_matrix(fen):
    board = chess.Board(fen)
    piece_map = board.piece_map()
    matrix = np.zeros((8, 8), dtype=int)
    for square, piece in piece_map.items():
        row = 7 - (square // 8)
        col = square % 8
        matrix[row, col] = piece.piece_type * (1 if piece.color else -1)
    return matrix.flatten()


# Chuyển FEN thành ma trận
X = np.array([fen_to_matrix(fen) for fen in fen_list])
y = np.array(move_quality_labels)  # 1: tốt, 0: xấu

# Chia tập train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Xây dựng mô hình Neural Network phân loại nước đi tốt/xấu
model = Sequential([
    Dense(256, activation='relu', input_shape=(X.shape[1],)),
    Dense(128, activation='relu'),
    Dense(1, activation='sigmoid')
])

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

model.fit(X_train, y_train, epochs=10, batch_size=64, validation_split=0.1)

# Đánh giá mô hình
loss, acc = model.evaluate(X_test, y_test)
print(f"Neural Network move quality classification accuracy: {acc:.4f}")

# Lưu mô hình sau khi huấn luyện
model.save('model_move_quality.h5')
print("Đã lưu mô hình vào file model_move_quality.h5")
