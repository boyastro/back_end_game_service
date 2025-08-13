import json
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.utils import to_categorical

# Đọc dữ liệu từ games.json
with open('data/games.json', 'r') as f:
    games = json.load(f)

# Tiền xử lý: lấy FEN và move
fen_list = []
move_list = []
for game in games:
    # Nếu dữ liệu là danh sách các moves, mỗi move có fen và move
    if 'moves' in game:
        for m in game['moves']:
            fen = m.get('fen')
            move = m.get('move')
            if fen and move:
                # Chuyển move thành chuỗi, ví dụ: 'e2e4' hoặc 'from_x_from_y_to_x_to_y'
                move_str = f"{move['from']['x']}{move['from']['y']}{move['to']['x']}{move['to']['y']}"
                fen_list.append(fen)
                move_list.append(move_str)


# Chuyển FEN thành vector đặc trưng đơn giản (ví dụ: mã hóa từng ký tự)
def fen_to_vector(fen):
    return [ord(c) for c in fen]

X = [fen_to_vector(fen) for fen in fen_list]
move_labels, y = np.unique(move_list, return_inverse=True)
y_cat = to_categorical(y)

# Đảm bảo các vector có cùng độ dài (cắt hoặc padding)
max_len = max(len(x) for x in X)
X = np.array([x + [0]*(max_len - len(x)) for x in X])

# Chia tập train/test
X_train, X_test, y_train, y_test = train_test_split(X, y_cat, test_size=0.2, random_state=42)

# Xây dựng mô hình Neural Network đơn giản
model = Sequential([
    Dense(256, activation='relu', input_shape=(X.shape[1],)),
    Dense(128, activation='relu'),
    Dense(y_cat.shape[1], activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.fit(X_train, y_train, epochs=10, batch_size=64, validation_split=0.1)

# Đánh giá mô hình
loss, acc = model.evaluate(X_test, y_test)
print(f"Neural Network move prediction accuracy: {acc:.4f}")
