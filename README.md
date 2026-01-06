# Web会议系统

## 系统概述

这是一个基于Flask和纯JavaScript开发的简易Web会议系统，支持实时多人在线会议、文字聊天等功能。系统使用前后端分离的架构设计，采用HTTP轮询方式实现消息的实时性。

## 功能特性

- **创建会议**: 用户可以创建新的会议并自动成为会议成员
- **加入会议**: 用户可以通过URL加入已存在的会议
- **会议聊天**: 支持会议内成员之间的实时文字聊天
- **成员管理**: 实时显示会议中的成员列表
- **会话保持**: 使用Cookie保持用户会话，无需重复登录
- **离开会议**: 用户可以随时离开会议

## 技术实现

### 前端

- 纯原生JavaScript，无需任何框架
- 使用Fetch API进行HTTP请求
- 采用轮询机制获取最新消息
- 响应式设计，适配不同屏幕尺寸

### 后端

- Flask Web框架
- 使用UUID生成唯一会议标识
- 内存存储会议信息(实际应用中可替换为数据库)
- 使用Cookie保持用户会话状态

## 系统架构

系统分为三个主要页面：
1. 创建会议界面
2. 加入会议界面
3. 会议交互界面

后端API包括：
- `/api/create`: 创建新会议
- `/api/join`: 加入已有会议
- `/api/check_session`: 检查会话状态
- `/api/messages`: 获取会议消息和成员列表
- `/api/send`: 发送消息
- `/api/leave`: 离开会议

## 数据结构

会议数据结构：
```python
{
    "meeting_id": {
        "name": "会议名称",
        "members": {
            "成员名称": 加入时间戳
        },
        "messages": [
            {
                "sender": "发送者",
                "content": "消息内容",
                "time": "发送时间"
            }
        ]
    }
}
```

## 使用方法

1. 运行Flask服务器：`python chat.py`
2. 访问 `http://localhost/` 创建新会议
3. 通过 `http://localhost/{meeting_id}` 加入已有会议
4. 输入成员名称，开始参与会议聊天

## 运行截图

![创建会议界面](C:\Users\26274\AppData\Roaming\Typora\typora-user-images\image-20250526173447890.png)
![加入会议界面](C:\Users\26274\AppData\Roaming\Typora\typora-user-images\image-20250526173315097.png)
![会议交互界面](C:\Users\26274\AppData\Roaming\Typora\typora-user-images\image-20250526173403122.png)

## 改进方向

- 添加WebSocket实现更高效的实时通信
- 增加视频/语音会议功能
- 添加文件共享功能
- 实现会议录制功能
- 加入权限控制系统
- 使用数据库持久化存储会议数据

## 代码讲解

### 后端代码解析

#### Flask路由设计
后端使用Flask框架实现了RESTful API，主要路由包括：

```python
@app.route('/')  # 主页路由，返回创建会议页面
@app.route('/<meeting_id>')  # 会议ID路由，根据ID加入相应会议
@app.route('/api/create', methods=['POST'])  # 创建会议API
@app.route('/api/join', methods=['POST'])  # 加入会议API
@app.route('/api/messages')  # 获取消息和成员列表API
@app.route('/api/send', methods=['POST'])  # 发送消息API
@app.route('/api/leave')  # 离开会议API
@app.route('/api/check_session')  # 检查会话状态API
```

#### 会议数据管理
```python
# 使用字典存储所有会议信息
meetings = {}

# 创建会议函数
def create_meeting(name):
    meeting_id = str(uuid.uuid4())
    meetings[meeting_id] = {
        "name": name,
        "members": {},
        "messages": []
    }
    return meeting_id
```

#### 会话管理
使用Flask的session对象管理用户会话：
```python
# 设置用户会话
session['user_name'] = user_name
session['meeting_id'] = meeting_id

# 检查会话状态
if 'user_name' in session and 'meeting_id' in session:
    # 用户已登录
else:
    # 用户未登录
```

### 前端代码解析

#### HTTP轮询机制
```javascript
// 定时获取最新消息
function pollMessages() {
    fetch('/api/messages')
        .then(response => response.json())
        .then(data => {
            updateMessages(data.messages);
            updateMembers(data.members);
        });
    
    // 每2秒轮询一次
    setTimeout(pollMessages, 2000);
}
```

#### 消息发送处理
```javascript
// 发送消息函数
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (content) {
        fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                messageInput.value = '';
            }
        });
    }
}
```

#### 动态DOM更新
```javascript
// 更新消息列表
function updateMessages(messages) {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <span class="sender">${message.sender}</span>
            <span class="time">${message.time}</span>
            <div class="content">${message.content}</div>
        `;
        messagesContainer.appendChild(messageElement);
    });
    
    // 自动滚动到最新消息
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
```

### 关键实现细节

1. **无刷新更新**：使用JavaScript的Fetch API和DOM操作实现页面内容的无刷新更新

2. **响应式设计**：使用CSS媒体查询适配不同屏幕尺寸：
   ```css
   @media (max-width: 768px) {
       .meeting-container {
           flex-direction: column;
       }
       .chat-area, .members-list {
           width: 100%;
       }
   }
   ```

3. **错误处理**：前后端均实现了完善的错误处理机制：
   ```javascript
   fetch('/api/join', {
       method: 'POST',
       // ...
   })
   .then(response => {
       if (!response.ok) {
           throw new Error('网络错误');
       }
       return response.json();
   })
   .then(data => {
       if (data.status === 'error') {
           showError(data.message);
       } else {
           window.location.href = '/' + data.meeting_id;
       }
   })
   .catch(error => {
       showError('请求失败: ' + error.message);
   });
   ```

4. **安全性考虑**：
   - 使用Flask的session进行会话管理
   - 对用户输入进行验证和清理
   - 设置会话过期时间
"# web_meeting_system" 
