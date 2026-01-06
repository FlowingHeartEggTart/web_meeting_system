from flask import Flask, request, render_template, jsonify, make_response
import uuid
from datetime import datetime

app = Flask(__name__, static_folder='static', static_url_path='/static')

# 在内存中存储会议信息
meetings = {}  # 格式: {uuid: {name: str, members: {member_name: timestamp}, messages: []}}

@app.route('/')
def index():
    """显示新建会议页面"""
    return render_template('chat.html')

@app.route('/<meeting_id>')
def meeting_page(meeting_id):
    """根据会议ID显示加入会议页面或会议交互界面"""
    if meeting_id in meetings:
        return render_template('chat.html', meeting_id=meeting_id)
    return "会议不存在", 404

@app.route('/api/create', methods=['POST'])
def create_meeting():
    """创建新会议"""
    data = request.json
    meeting_name = data.get('meeting_name')
    member_name = data.get('member_name')
    
    if not meeting_name or not member_name:
        return jsonify({"error": "会议名称和成员名称不能为空"}), 400
    
    # 生成UUID作为会议唯一标识
    meeting_id = str(uuid.uuid4())
    meetings[meeting_id] = {
        "name": meeting_name,
        "members": {member_name: datetime.now()},
        "messages": []
    }
    
    # 设置cookie保存会话
    resp = make_response(jsonify({
        "meeting_id": meeting_id,
        "meeting_name": meeting_name
    }))
    resp.set_cookie(f'meeting_{meeting_id}', member_name)
    
    return resp

@app.route('/api/join', methods=['POST'])
def join_meeting():
    """加入现有会议"""
    data = request.json
    meeting_id = data.get('meeting_id')
    member_name = data.get('member_name')
    
    if not meeting_id or not member_name:
        return jsonify({"error": "会议ID和成员名称不能为空"}), 400
    
    if meeting_id not in meetings:
        return jsonify({"error": "会议不存在"}), 404
    
    # 添加成员到会议
    meetings[meeting_id]["members"][member_name] = datetime.now()
    
    # 设置cookie保存会话
    resp = make_response(jsonify({
        "status": "success",
        "meeting_name": meetings[meeting_id]["name"]
    }))
    resp.set_cookie(f'meeting_{meeting_id}', member_name)
    
    return resp

@app.route('/api/check_session', methods=['GET'])
def check_session():
    """检查用户会话状态"""
    meeting_id = request.args.get('meeting_id')
    
    if not meeting_id or meeting_id not in meetings:
        return jsonify({"status": "no_session"})
    
    member_name = request.cookies.get(f'meeting_{meeting_id}')
    
    if member_name and member_name in meetings[meeting_id]["members"]:
        return jsonify({
            "status": "logged_in",
            "member_name": member_name,
            "meeting_name": meetings[meeting_id]["name"]
        })
    
    return jsonify({
        "status": "not_logged_in",
        "meeting_name": meetings[meeting_id]["name"]
    })

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """获取会议消息和成员列表"""
    meeting_id = request.args.get('meeting_id')
    
    if not meeting_id or meeting_id not in meetings:
        return jsonify({"error": "会议不存在"}), 404
    
    return jsonify({
        "messages": meetings[meeting_id]["messages"],
        "members": list(meetings[meeting_id]["members"].keys())
    })

@app.route('/api/send', methods=['POST'])
def send_message():
    """发送消息"""
    data = request.json
    meeting_id = data.get('meeting_id')
    member_name = data.get('member_name')
    message = data.get('message')
    
    if not meeting_id or not member_name or not message:
        return jsonify({"error": "参数不完整"}), 400
    
    if meeting_id not in meetings:
        return jsonify({"error": "会议不存在"}), 404
    
    if member_name not in meetings[meeting_id]["members"]:
        return jsonify({"error": "成员不存在"}), 404
    
    # 添加消息到会议
    meetings[meeting_id]["messages"].append({
        "sender": member_name,
        "content": message,
        "time": datetime.now().strftime('%H:%M:%S')
    })
    
    return jsonify({"status": "success"})

@app.route('/api/leave', methods=['POST'])
def leave_meeting():
    """离开会议"""
    data = request.json
    meeting_id = data.get('meeting_id')
    member_name = data.get('member_name')
    
    if not meeting_id or not member_name:
        return jsonify({"error": "参数不完整"}), 400
    
    if meeting_id not in meetings:
        return jsonify({"error": "会议不存在"}), 404
    
    # 从会议中移除成员
    if member_name in meetings[meeting_id]["members"]:
        del meetings[meeting_id]["members"][member_name]
    
    # 清除cookie
    resp = make_response(jsonify({"status": "success"}))
    resp.delete_cookie(f'meeting_{meeting_id}')
    
    return resp

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=80)