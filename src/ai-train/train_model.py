import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

# Đọc dữ liệu từ games.json
with open('data/games.json', 'r') as f:
    games = json.load(f)

# Tiền xử lý: chuyển thành DataFrame, trích xuất đặc trưng đơn giản
# Bạn có thể mở rộng thêm các đặc trưng khác nếu cần
for g in games:
    g['num_moves'] = len(g.get('moves', []))
    g['is_checkmate'] = int(g.get('reason', '') == 'checkmate')
    g['ai_win'] = int(g.get('result', '') == '1-0')
    g['ai_lose'] = int(g.get('result', '') == '0-1')

df = pd.DataFrame(games)

# Chọn features và label
X = df[['num_moves', 'is_checkmate']]
y = df['ai_win']

# Chia tập train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Huấn luyện Decision Tree
dt = DecisionTreeClassifier()
dt.fit(X_train, y_train)
y_pred_dt = dt.predict(X_test)
print('Decision Tree accuracy:', accuracy_score(y_test, y_pred_dt))

# Huấn luyện Random Forest
rf = RandomForestClassifier()
rf.fit(X_train, y_train)
y_pred_rf = rf.predict(X_test)
print('Random Forest accuracy:', accuracy_score(y_test, y_pred_rf))
