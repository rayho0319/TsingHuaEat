
import sqlite3
from pathlib import Path

DB = Path(__file__).parent / "the.db"

prices = [
    ("紅燒如意坊", 70, 130),
    ("友記快餐館", 75, 120),
    ("鼎盛蔬食(自助餐)", 60, 120),
    ("茗釀茶品", 25, 60),
    ("碳烤小姐", 90, 110),
    ("同食角落", 110, 155),
    ("喜番咖哩", 90, 140),
    ("帕森義大利麵", 95, 125),
    ("鳴野食蘋早午餐", 25, 100),
    ("珍御品粥麵館", 80, 90),
    ("墨尼捲餅", 90, 125),
    ("牛肉先生", 80, 290),
    ("瑪尼卡巴", 75, 130),
    ("好富熟成黑咖哩.台式蓋飯", 75, 125),
    ("一番快餐", 80, 100),
    ("蘇記牛肉麵", 85, 160),
    ("漢城異國美食", 80, 100),
    ("比司多早午餐", 60, 95),
    ("包子商行", 25, 85),
    ("珈名鮮茶", 30, 60),
    ("朕豪自助餐", 80, 130),
    ("蓉城吳抄手", 65, 110),
    ("芝芝越南料理", 70, 220),
    ("韓棧鍋物", 65, 130),
    ("A華加湯滷味", 100, 200),
    ("四海遊龍", 35, 120),
    ("利竫和食", 60, 110),
    ("奕川香", 55, 110),
    ("丘森茶室", 55, 119),
    ("Ginzeng", 110, 200),
    ("翔羚食堂", 75, 120),
    ("Sandwich Express", 35, 110),
]

success = 0
failed = []

with sqlite3.connect(DB) as conn:
    for name, price_min, price_max in prices:
        rows = conn.execute(
            "SELECT id FROM restaurants WHERE name = ?",
            (name,)
        ).fetchall()

        if len(rows) != 1:
            failed.append(name)
            print(f"無法唯一比對：{name}")
            continue

        conn.execute("""
            UPDATE restaurants
            SET price_min = ?, price_max = ?
            WHERE id = ?
        """, (price_min, price_max, rows[0][0]))

        success += 1
        print(f"更新成功：{name} ${price_min}~{price_max}")

print(f"\n成功更新：{success} 家")
print(f"比對失敗：{len(failed)} 家")

if failed:
    print("待確認名稱：", failed)
