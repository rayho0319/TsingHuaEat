import os, sqlite3, random, re
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

app=Flask(__name__)
app.secret_key=os.environ.get('SECRET_KEY','dev-only-change-this-key')
DB=os.environ.get('DATABASE',os.path.join(os.path.dirname(__file__),'the.db'))
DEMO=[('清華麵屋（示範）','麵食',95,'校園周邊','湯麵、乾麵',1),('小樹便當（示範）','飯類',110,'校園周邊','家常便當',1),('綠意輕食（示範）','輕食',145,'校園周邊','沙拉與三明治',1),('香香咖哩（示範）','飯類',130,'校園周邊','咖哩飯',1),('元氣漢堡（示範）','速食',120,'校園周邊','漢堡與薯條',1),('平價麵坊（示範）','麵食',75,'校園周邊','銅板美食',1),('好食蔬坊（示範）','輕食',160,'校園周邊','蔬食料理',1),('熱炒食堂（示範）','飯類',180,'校園周邊','熱炒與套餐',1)]

def conn():
    c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c

def init():
    with conn() as c:
        c.executescript('''CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS restaurants(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT,price INTEGER,area TEXT,description TEXT,demo INTEGER DEFAULT 0,picks INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,restaurant_id INTEGER NOT NULL,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT,created_at TEXT,UNIQUE(user_id,restaurant_id),FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(restaurant_id) REFERENCES restaurants(id));
        CREATE TABLE IF NOT EXISTS review_likes(review_id INTEGER NOT NULL,user_id INTEGER NOT NULL,PRIMARY KEY(review_id,user_id),FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS groups(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,name TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'include',FOREIGN KEY(user_id) REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS group_items(group_id INTEGER NOT NULL,restaurant_id INTEGER NOT NULL,PRIMARY KEY(group_id,restaurant_id),FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,FOREIGN KEY(restaurant_id) REFERENCES restaurants(id));''')
        if not c.execute('SELECT 1 FROM restaurants LIMIT 1').fetchone():
            c.executemany('INSERT INTO restaurants(name,category,price,area,description,demo) VALUES(?,?,?,?,?,?)',DEMO)
init()

def user():return session.get('uid')
def bad(msg,code=400):return jsonify(error=msg),code

def restaurants():
    with conn() as c:
        rows=c.execute('''SELECT r.*,ROUND(AVG(v.rating),1) avg_rating,COUNT(v.id) review_count FROM restaurants r LEFT JOIN reviews v ON v.restaurant_id=r.id GROUP BY r.id ORDER BY r.id''').fetchall()
        return [dict(r) for r in rows]

@app.get('/')
def home():return render_template('index.html')

@app.get('/api/restaurants')
def get_restaurants():return jsonify(restaurants())

@app.get('/api/me')
def me():return jsonify(username=session.get('username'))

@app.post('/api/auth/<action>')
def auth(action):
    d=request.get_json(silent=True) or {};name=str(d.get('username','')).strip();pw=str(d.get('password',''))
    if action=='logout':session.clear();return jsonify(ok=True)
    if not 3<=len(name)<=32 or not 6<=len(pw)<=128:return bad('帳號需 3–32 字，密碼至少 6 字')
    with conn() as c:
        if action=='register':
            try:
                cur=c.execute('INSERT INTO users(username,password) VALUES(?,?)',(name,generate_password_hash(pw)));uid=cur.lastrowid
                c.execute('INSERT INTO groups(user_id,name,kind) VALUES(?,?,?)',(uid,'我的最愛','include'))
                c.execute('INSERT INTO groups(user_id,name,kind) VALUES(?,?,?)',(uid,'不吃清單','exclude'))
            except sqlite3.IntegrityError:return bad('帳號已被使用')
        elif action=='login':
            r=c.execute('SELECT * FROM users WHERE username=?',(name,)).fetchone()
            if not r or not check_password_hash(r['password'],pw):return bad('帳號或密碼不正確',401)
            uid=r['id']
        else:return bad('未知操作',404)
    session.clear();session['uid']=uid;session['username']=name;return jsonify(ok=True,username=name)

@app.get('/api/reviews/<int:rid>')
def reviews(rid):
    uid=user() or -1
    with conn() as c:
        rows=c.execute('''SELECT v.id,u.username,v.rating,v.comment,v.created_at,
                          COUNT(l.user_id) AS likes,
                          MAX(CASE WHEN l.user_id=? THEN 1 ELSE 0 END) AS liked
                          FROM reviews v
                          JOIN users u ON u.id=v.user_id
                          LEFT JOIN review_likes l ON l.review_id=v.id
                          WHERE v.restaurant_id=?
                          GROUP BY v.id
                          ORDER BY v.id DESC''',(uid,rid)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post('/api/reviews/<int:rid>')
def review(rid):
    if not user():return bad('請先登入',401)
    d=request.get_json(silent=True) or {}
    try:rating=int(d.get('rating',0))
    except:rating=0
    comment=str(d.get('comment','')).strip()
    if not 1<=rating<=5 or len(comment)>500:return bad('評分須為 1–5，評論不得超過 500 字')
    with conn() as c:
        if not c.execute('SELECT 1 FROM restaurants WHERE id=?',(rid,)).fetchone():return bad('找不到餐廳',404)
        c.execute('''INSERT INTO reviews(user_id,restaurant_id,rating,comment,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,restaurant_id) DO UPDATE SET rating=excluded.rating,comment=excluded.comment,created_at=excluded.created_at''',(user(),rid,rating,comment,datetime.now().strftime('%Y-%m-%d %H:%M')))
    return jsonify(ok=True)

@app.post('/api/reviews/<int:review_id>/like')
def like_review(review_id):
    if not user():return bad('請先登入才能按讚',401)
    with conn() as c:
        if not c.execute('SELECT 1 FROM reviews WHERE id=?',(review_id,)).fetchone():return bad('找不到該則評價',404)
        old=c.execute('SELECT 1 FROM review_likes WHERE review_id=? AND user_id=?',(review_id,user())).fetchone()
        if old:c.execute('DELETE FROM review_likes WHERE review_id=? AND user_id=?',(review_id,user()))
        else:c.execute('INSERT INTO review_likes(review_id,user_id) VALUES(?,?)',(review_id,user()))
    return jsonify(liked=not bool(old))

@app.get('/api/groups')
def groups():
    if not user():return jsonify([])
    with conn() as c:
        rows=c.execute('SELECT * FROM groups WHERE user_id=? ORDER BY id',(user(),)).fetchall()
        return jsonify([dict(r)|{'items':[x['restaurant_id'] for x in c.execute('SELECT restaurant_id FROM group_items WHERE group_id=?',(r['id'],))]} for r in rows])

@app.post('/api/groups')
def new_group():
    if not user():return bad('請先登入',401)
    d=request.get_json(silent=True) or {};name=str(d.get('name','')).strip();kind=d.get('kind','include')
    if not 1<=len(name)<=40 or kind not in ('include','exclude'):return bad('群組名稱或類型不正確')
    with conn() as c:gid=c.execute('INSERT INTO groups(user_id,name,kind) VALUES(?,?,?)',(user(),name,kind)).lastrowid
    return jsonify(id=gid)

@app.delete('/api/groups/<int:gid>')
def delete_group(gid):
    if not user():return bad('請先登入',401)
    with conn() as c:
        c.execute('DELETE FROM group_items WHERE group_id IN (SELECT id FROM groups WHERE id=? AND user_id=?)',(gid,user()))
        cur=c.execute('DELETE FROM groups WHERE id=? AND user_id=?',(gid,user()))
    return jsonify(ok=bool(cur.rowcount))

@app.post('/api/groups/<int:gid>/toggle')
def toggle(gid):
    if not user():return bad('請先登入',401)
    d=request.get_json(silent=True) or {}
    try:rid=int(d.get('restaurant_id'))
    except:return bad('餐廳 ID 錯誤')
    with conn() as c:
        if not c.execute('SELECT 1 FROM groups WHERE id=? AND user_id=?',(gid,user())).fetchone():return bad('群組不存在',404)
        if not c.execute('SELECT 1 FROM restaurants WHERE id=?',(rid,)).fetchone():return bad('餐廳不存在',404)
        old=c.execute('SELECT 1 FROM group_items WHERE group_id=? AND restaurant_id=?',(gid,rid)).fetchone()
        if old:c.execute('DELETE FROM group_items WHERE group_id=? AND restaurant_id=?',(gid,rid))
        else:c.execute('INSERT INTO group_items(group_id,restaurant_id) VALUES(?,?)',(gid,rid))
    return jsonify(added=not bool(old))

@app.post('/api/pick/<int:rid>')
def pick(rid):
    with conn() as c:c.execute('UPDATE restaurants SET picks=picks+1 WHERE id=?',(rid,))
    return jsonify(ok=True)

if __name__=='__main__':app.run(debug=os.environ.get('FLASK_DEBUG')=='1',host='127.0.0.1',port=int(os.environ.get('PORT',5000)))