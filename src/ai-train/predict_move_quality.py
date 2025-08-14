import sys
import numpy as np
import chess
import tensorflow as tf

# Load mô hình đã huấn luyện
model = tf.keras.models.load_model('model_move_quality.h5')

def fen_to_matrix(fen):
    board = chess.Board(fen)
    piece_map = board.piece_map()
    matrix = np.zeros((8, 8), dtype=int)
    for square, piece in piece_map.items():
        row = 7 - (square // 8)
        col = square % 8
        matrix[row, col] = piece.piece_type * (1 if piece.color else -1)
    return matrix.flatten()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("0.0")
        sys.exit(1)
    fen = sys.argv[1]
    x = np.array([fen_to_matrix(fen)])
    score = model.predict(x)[0][0]
    print(f"{score}")
