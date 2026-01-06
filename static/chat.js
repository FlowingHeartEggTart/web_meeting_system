document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const createMeetingContainer = document.getElementById('create-meeting-container');
    const joinMeetingContainer = document.getElementById('join-meeting-container');
    const chatContainer = document.getElementById('chat-container');
    
    const meetingNameInput = document.getElementById('meeting-name');
    const createMemberNameInput = document.getElementById('create-member-name');
    const joinMemberNameInput = document.getElementById('join-member-name');
    const joinMeetingName = document.getElementById('join-meeting-name');
    const meetingTitle = document.getElementById('meeting-title');
    
    const createButton = document.getElementById('create-button');
    const joinButton = document.getElementById('join-button');
    const leaveButton = document.getElementById('leave-button');
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    
    const membersList = document.getElementById('members-list');
    const messagesContainer = document.getElementById('messages-container');
    
    // 全局变量
    let currentMeetingId = null;
    let currentMemberName = null;
    let messagesPollingInterval = null;
    
    // 检查URL中是否包含会议ID
    const path = window.location.pathname;
    const meetingId = path.length > 1 ? path.substring(1) : null;
    
    if (meetingId) {
        // 有会议ID，检查会话状态
        checkSession(meetingId);
    } else {
        // 没有会议ID，显示创建会议界面
        createMeetingContainer.style.display = 'block';
    }
    
    // 检查用户会话状态
    function checkSession(meetingId) {
        fetch(`/api/check_session?meeting_id=${meetingId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'logged_in') {
                    // 已登录，直接进入会议
                    currentMeetingId = meetingId;
                    currentMemberName = data.member_name;
                    enterChatRoom(data.meeting_name);
                } else if (data.status === 'not_logged_in') {
                    // 未登录，显示加入会议界面
                    joinMeetingName.textContent = data.meeting_name;
                    joinMeetingContainer.style.display = 'block';
                    createMeetingContainer.style.display = 'none';
                } else {
                    // 会话不存在
                    alert('会议不存在');
                    window.location.href = '/';
                }
            })
            .catch(error => {
                console.error('检查会话失败:', error);
                alert('检查会话失败，请重试');
            });
    }
    
    // 创建会议
    createButton.addEventListener('click', function() {
        const meetingName = meetingNameInput.value.trim();
        const memberName = createMemberNameInput.value.trim();
        
        if (!meetingName || !memberName) {
            alert('会议名称和成员名称不能为空');
            return;
        }
        
        fetch('/api/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meeting_name: meetingName,
                member_name: memberName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.meeting_id) {
                currentMeetingId = data.meeting_id;
                currentMemberName = memberName;
                
                // 更新URL但不刷新页面
                window.history.pushState({}, '', `/${currentMeetingId}`);
                
                // 进入聊天室
                enterChatRoom(meetingName);
            } else {
                alert('创建会议失败: ' + (data.error || '未知错误'));
            }
        })
        .catch(error => {
            console.error('创建会议失败:', error);
            alert('创建会议失败，请重试');
        });
    });
    
    // 加入会议
    joinButton.addEventListener('click', function() {
        const memberName = joinMemberNameInput.value.trim();
        
        if (!memberName) {
            alert('成员名称不能为空');
            return;
        }
        
        fetch('/api/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meeting_id: meetingId,
                member_name: memberName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                currentMeetingId = meetingId;
                currentMemberName = memberName;
                
                // 进入聊天室
                enterChatRoom(data.meeting_name);
            } else {
                alert('加入会议失败: ' + (data.error || '未知错误'));
            }
        })
        .catch(error => {
            console.error('加入会议失败:', error);
            alert('加入会议失败，请重试');
        });
    });
    
    // 离开会议
    leaveButton.addEventListener('click', function() {
        if (confirm('确定要离开会议吗？')) {
            fetch('/api/leave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    meeting_id: currentMeetingId,
                    member_name: currentMemberName
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // 停止轮询
                    clearInterval(messagesPollingInterval);
                    
                    // 返回首页
                    window.location.href = '/';
                } else {
                    alert('离开会议失败: ' + (data.error || '未知错误'));
                }
            })
            .catch(error => {
                console.error('离开会议失败:', error);
                alert('离开会议失败，请重试');
            });
        }
    });
    
    // 发送消息
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    function sendMessage() {
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        fetch('/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meeting_id: currentMeetingId,
                member_name: currentMemberName,
                message: message
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                messageInput.value = '';
                // 立即获取最新消息
                fetchMessages();
            } else {
                alert('发送消息失败: ' + (data.error || '未知错误'));
            }
        })
        .catch(error => {
            console.error('发送消息失败:', error);
            alert('发送消息失败，请重试');
        });
    }
    
    // 获取消息和成员列表
    function fetchMessages() {
        fetch(`/api/messages?meeting_id=${currentMeetingId}`)
            .then(response => response.json())
            .then(data => {
                updateMembersList(data.members);
                updateMessagesContainer(data.messages);
            })
            .catch(error => {
                console.error('获取消息失败:', error);
            });
    }
    
    // 更新成员列表
    function updateMembersList(members) {
        membersList.innerHTML = '';
        members.forEach(member => {
            const li = document.createElement('li');
            li.textContent = member;
            membersList.appendChild(li);
        });
    }
    
    // 更新消息容器
    function updateMessagesContainer(messages) {
        messagesContainer.innerHTML = '';
        
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender === currentMemberName ? 'own' : 'other'}`;
            
            const senderDiv = document.createElement('div');
            senderDiv.className = 'sender';
            senderDiv.textContent = msg.sender;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            contentDiv.textContent = msg.content;
            
            const timeDiv = document.createElement('div');
            timeDiv.className = 'time';
            timeDiv.textContent = msg.time;
            
            messageDiv.appendChild(senderDiv);
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(timeDiv);
            
            messagesContainer.appendChild(messageDiv);
        });
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // 进入聊天室
    function enterChatRoom(meetingName) {
        createMeetingContainer.style.display = 'none';
        joinMeetingContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        
        meetingTitle.textContent = meetingName;
        
        // 获取初始消息
        fetchMessages();
        
        // 设置定时获取消息
        messagesPollingInterval = setInterval(fetchMessages, 2000);
    }
});