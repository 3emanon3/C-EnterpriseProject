const API_BASE_URL = '../recervingAPI.php';

// 实用函数
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeForInput(dateTimeStr) {
    if (!dateTimeStr) return '';
    // 将MySQL日期时间格式转换为HTML datetime-local输入格式
    return dateTimeStr.replace(' ', 'T');
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取URL参数中的事件ID
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    let formChanged = false;
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('change', () => {
            formChanged = true;
        });
    });

    // Add navigation warning
    window.addEventListener('beforeunload', (e) => {
        if (formChanged) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });

    // 如果有事件ID，则加载事件详情
    if (eventId) {
        loadEventDetails(eventId);
    } else {
        // 如果没有ID，显示错误信息
        alert('未指定事件ID，无法编辑事件。');
        goBack();
    }
    

    
    // 设置表单提交事件
    const eventForm = document.getElementById('eventForm');
    eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm()) {
            saveEvent(eventId);
        }
    });
    
    // 设置日期时间输入的最小值
    const startTimeInput = document.getElementById('eventStartTime');
    const endTimeInput = document.getElementById('eventEndTime');
   
    
    // 确保结束时间在开始时间之后
    startTimeInput.addEventListener('change', () => {
        endTimeInput.min = startTimeInput.value;
        if (endTimeInput.value && endTimeInput.value < startTimeInput.value) {
            endTimeInput.value = startTimeInput.value;
        }
    });
});

// 加载事件详情
async function loadEventDetails(eventId) {
    try {
        console.log(`Fetching event data for ID: ${eventId}`);
        const response = await fetch(`${API_BASE_URL}?table=event&search=true&ID=${eventId}`);
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('加载的事件数据:', data);
        
        if (data.data && data.data.length > 0) {//problem(reason???)
            populateForm(data.data[0]);
        } else {
            alert('无法加载事件详情。');
            console.error('加载事件详情失败:', data);
        }
    } catch (error) {
        console.error('加载事件详情时出错:', error);
        alert(`加载事件详情时出错: ${error.message}`);
    }
}

// 填充表单
function populateForm(event) {
    document.getElementById('eventId').value = event.ID || '';
    console.log('Set event ID to:',  event.ID);
    document.getElementById('eventTitle').value = event.title || '';
    document.getElementById('eventStatus').value = event.status || 'not started';
    document.getElementById('eventStartTime').value = formatDateTimeForInput(event.start_time) || '';
    document.getElementById('eventEndTime').value = formatDateTimeForInput(event.end_time) || '';
    document.getElementById('eventCreateTime').value =formatDateTimeForInput(event.created_at) || '';
    document.getElementById('eventLocation').value = event.location || '';
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('eventMaxParticipant').value = event.max_participant || '';
    document.getElementById('eventRegistrationDeadline').value = formatDateTimeForInput(event.registration_deadline) || '';
    document.getElementById('eventPrice').value = event.price || '';
    document.getElementById('eventOnlineLink').value = event.online_link || '';
}

// 保存事件
async function saveEvent(eventId) {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Saving...';
    document.body.appendChild(loadingIndicator);

    try {
        // 收集表单数据
        const formData = new FormData(document.getElementById('eventForm'));
        const eventData = {};
        
        formData.forEach((value, key) => {
            eventData[key] = value;
        });
        
        const formIdValue = document.getElementById('eventId').value;
        
        // Use the form value if it exists and is not zero, otherwise use the parameter
        eventData.ID = (formIdValue && formIdValue !== '0') ? formIdValue : eventId;
        
        console.log('Using ID for update:', eventData.ID);22
        
        // 添加必要的参数
        eventData.action = 'update';
        eventData.table = 'event';
        
        console.log('发送的数据:', eventData);
        
        // 发送请求
        const response = await fetch(`${API_BASE_URL}?table=event&ID=${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        const data = await response.json();
        console.log('保存结果:', data);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`服务器响应错误: ${response.status}, ${errorText}`);
        }

        if (data.status === 'success' || data.success) {
            alert('事件保存成功！');
            window.location.href = 'searchEvent.html';
        } else {
            alert(`保存事件失败: ${data.message || '未知错误'}`);
        }
    } catch (error) {
        console.error('保存事件时出错:', error);
        alert(`保存事件时出错: ${error.message}`);
    }
}

// 表单验证
function validateForm() {
    // 获取表单值
    const startTime = new Date(document.getElementById('eventStartTime').value);
    const endTime = new Date(document.getElementById('eventEndTime').value);
    const registrationDeadline = new Date(document.getElementById('eventRegistrationDeadline').value);
    const maxParticipants = parseInt(document.getElementById('eventMaxParticipant').value);
    const now = new Date();
    
    // 验证日期
    if (!title) {
        alert('Please enter an event title.');
        return false;
    }
    
    if (isNaN(startTime.getTime())) {
        alert('Please enter a valid start time.');
        return false;
    }

    if (isNaN(endTime.getTime())) {
        alert('Please enter a valid end time.');
        return false;
    }

    if (endTime <= startTime) {
        alert('End time must be after start time.');
        return false;
    }
    
    if (!isNaN(registrationDeadline.getTime()) && registrationDeadline > startTime) {
        alert('Registration deadline must be before the event starts.');
        return false;
    }
    
    if (isNaN(maxParticipants) || maxParticipants <= 0) {
        alert('Maximum participants must be greater than 0.');
        return false;
    }
    
    return true;
}

// 返回上一页
function goBack() {
    window.history.back();
}