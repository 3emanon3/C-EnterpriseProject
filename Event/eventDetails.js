const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.addEventListener('DOMContentLoaded', function() {
    // DOM element references
    const tableBody = document.querySelector('tbody');
    const errorContainer = document.createElement('div');
    errorContainer.id = 'errorMessages';
    errorContainer.className = 'alert alert-danger';
    errorContainer.style.display = 'none';
    document.querySelector('.container').insertBefore(errorContainer, document.querySelector('h1').nextSibling);
    
    // Loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.className = 'loading-spinner';
    loadingIndicator.textContent = '加载中...';
    loadingIndicator.style.display = 'none';
    document.body.appendChild(loadingIndicator);
    
    // 会员搜索模态框元素
    const memberSearchModal = document.getElementById('memberSearchModal');
    const modalClose = document.querySelector('.close');
    const modalSearchInput = document.getElementById('modalSearchInput');
    const modalSearchButton = document.getElementById('modalSearchButton');
    const modalResultsBody = document.getElementById('modalResultsBody');
    const modalLoadingIndicator = document.getElementById('modalLoadingIndicator');
    const modalNoResults = document.getElementById('modalNoResults');
    const modalPagination = document.getElementById('modalPagination');
    const addMemberBtn = document.getElementById('addMemberBtn');
    
    // Get event ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    // Store return navigation parameters
let returnPage = urlParams.get('returnPage') || '';
let returnQuery = urlParams.get('returnQuery') || '';
let returnStatus = urlParams.get('returnStatus') || '';

    // 模态框事件监听
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            memberSearchModal.style.display = 'none';
        });
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === memberSearchModal) {
            memberSearchModal.style.display = 'none';
        }
    });
    
    // 搜索按钮点击事件
    if (modalSearchButton) {
        modalSearchButton.addEventListener('click', function() {
            performModalSearch(1);
        });
    }
    
    // 搜索输入框回车事件
    if (modalSearchInput) {
        modalSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performModalSearch(1);
            }
        });
        
        // 输入时自动搜索（防抖）
        modalSearchInput.addEventListener('input', debounce(function() {
            performModalSearch(1);
        }, 300));
    }
    
    // 添加会员按钮点击事件
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', function() {
            openMemberSearchModal();
        });
    }


    
    function updateReturnButtonUrl() {
        const returnButtons = document.querySelectorAll('.header-actions a.btn-secondary, .back-btn, a[href="searchEvent.html"]');
        
        if (returnButtons.length > 0) {
          
            
            // Then construct the return URL
            let returnUrl = 'searchEvent.html';
            const params = [];
            
            if (returnPage) params.push(`page=${returnPage}`);
            if (returnQuery) params.push(`query=${encodeURIComponent(returnQuery)}`);
            if (returnStatus) params.push(`status=${statusParam}`);
            
            if (params.length > 0) {
                returnUrl += '?' + params.join('&');
            }
            
            // Apply to all return buttons
            returnButtons.forEach(button => {
                button.href = returnUrl;
                
               
            });
            
            // Also handle browser back button when possible
            window.history.replaceState({returnUrl: returnUrl}, '', window.location.href);
        }
    }

        updateReturnButtonUrl();
    
    // Initialize - If there's an ID parameter, load event details
    if (eventId) {
        loadEventDetails(eventId);
    } else {
        // If no ID parameter, redirect back to search page
        showError('No event ID provided');
        setTimeout(() => {
            // Build return URL
            let redirectUrl = 'searchEvent.html';
            const params = [];
            
            if (returnPage) params.push(`page=${returnPage}`);
            if (returnQuery) params.push(`query=${encodeURIComponent(returnQuery)}`);
            if (returnStatus) params.push(`status=${returnStatus}`);
            
            if (params.length > 0) {
                redirectUrl += '?' + params.join('&');
            }
            
            window.location.href = redirectUrl;
        }, 2000);
    }
    
    // Load event details
    async function loadEventDetails(eventId) {
        showLoading();
        try {
            console.log(`Fetching event data for ID: ${eventId}`);
            const response = await fetch(`${API_BASE_URL}?table=event&search=true&ID=${eventId}`);
            if (!response.ok) {
                throw new Error(`Loading failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Loaded event data:', data);
            
            if (data.data && data.data.length > 0) {
                const event = data.data[0];
                displayEventDetails(event);
                // After displaying event details, fetch participants
                fetchParticipants(eventId);
                updateReturnButtonUrl();
            } else {
                showError('Event record not found');
                setTimeout(() => {
                    let redirectUrl = 'searchEvent.html';
                    const params = [];
                    
                    if (returnPage) params.push(`page=${returnPage}`);
                    if (returnQuery) params.push(`query=${encodeURIComponent(returnQuery)}`);
                    if (returnStatus) params.push(`status=${returnStatus}`);
                    
                    if (params.length > 0) {
                        redirectUrl += '?' + params.join('&');
                    }
                    
                    window.location.href = redirectUrl;
                }, 2000);
            }
        } catch (error) {
            console.error('Error loading event details:', error);
            showError(`Failed to load event details: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    // Display event details
    function displayEventDetails(event) {
        // Create a section for event details above the members table
        const eventDetailsSection = document.createElement('div');
        eventDetailsSection.className = 'event-details';
        
        // Format dates for display
        const startTime = formatDateTime(event.start_time);
        const endTime = formatDateTime(event.end_time);
        const createdAt = formatDateTime(event.created_at);
        const registrationDeadline = formatDateTime(event.registration_deadline);
        
        // Translate status to Chinese
        let statusText = event.status;
        switch(event.status) {
            case 'not started': statusText = '未开始'; break;
            case 'started': statusText = '已开始'; break;
            case 'cancelled': statusText = '已取消'; break;
            case 'ended': statusText = '已结束'; break;
        }
        
        // Create HTML for event details
        eventDetailsSection.innerHTML = `
            <h2>${event.title || '无标题'}</h2>
            <div class="event-info">
                <div class="info-row">
                    <div class="info-item">
                        <span class="label">状态:</span>
                        <span class="value status-${event.status}">${statusText}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">位置:</span>
                        <span class="value">${event.location || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">价格:</span>
                        <span class="value">RM${event.price || '0'} </span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <span class="label">开始时间:</span>
                        <span class="value">${startTime}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">结束时间:</span>
                        <span class="value">${endTime}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <span class="label">创建时间:</span>
                        <span class="value">${createdAt}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">报名截止日期:</span>
                        <span class="value">${registrationDeadline}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <span class="label">最大参与人数:</span>
                        <span class="value">${event.max_participant || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">在线链接:</span>
                        <span class="value">${event.online_link ? `<a href="${event.online_link}" target="_blank">${event.online_link}</a>` : 'N/A'}</span>
                    </div>
                </div>
                <div class="info-row full-width">
                    <div class="info-item">
                        <span class="label">描述:</span>
                        <div class="value description">${event.description || '无描述'}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add custom CSS for event details
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .event-details {
                margin-bottom: 30px;
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .event-details h2 {
                margin-top: 0;
                color: #800000;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            .event-info {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .info-row {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
            }
            .info-item {
                flex: 1;
                min-width: 200px;
            }
            .full-width {
                width: 100%;
            }
            .label {
                font-weight: bold;
                color: #555;
                display: block;
                margin-bottom: 5px;
            }
            .value {
                color: #333;
            }
            .description {
                white-space: pre-line;
                line-height: 1.5;
                margin-top: 5px;
                padding: 10px;
                background-color: #fff;
                border-radius: 3px;
                border: 1px solid #eee;
            }
            .status-not\\ started {
                color: #0066cc;
                font-weight: bold;
            }
            .status-started {
                color: #009900;
                font-weight: bold;
            }
            .status-cancelled {
                color: #cc0000;
                font-weight: bold;
            }
            .status-ended {
                color: #666666;
                font-weight: bold;
            }
            h1 {
                margin-bottom: 20px;
                color: #800000;
            }
            .loading-spinner {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(255, 255, 255, 0.8);
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                z-index: 1000;
            }
            .alert {
                padding: 15px;
                margin-bottom: 20px;
                border: 1px solid transparent;
                border-radius: 4px;
            }
            .alert-danger {
                color: #721c24;
                background-color: #f8d7da;
                border-color: #f5c6cb;
            }
        `;
        document.head.appendChild(styleTag);
        
        // Insert event details before the members table
        const container = document.querySelector('.container');
        container.insertBefore(eventDetailsSection, document.querySelector('h1').nextSibling);
        
        // Update page title
        document.querySelector('h1').textContent = '活动参与者列表';
        document.title = `${event.title} - 活动详情`;
    }
    
    // Fetch participants
// Update fetchParticipants function to correctly retrieve from vparticipants
async function fetchParticipants(eventId) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}?table=vparticipants&search=true&eventID=${eventId}`);
        if (!response.ok) {
            throw new Error(`Loading failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process and display the data
        if (data.data && data.data.length > 0) {
            // Filter to make sure we only get participants for this event
            const validParticipants = data.data.filter(p => p.eventID == eventId);
            populateParticipantsTable(validParticipants);
        } else {
            populateParticipantsTable([]);
        }
    } catch (error) {
        console.error('Error loading participants:', error);
        showError(`Failed to load participants: ${error.message}`);
    } finally {
        hideLoading();
    }
}
    
    // Populate participants table
    function populateParticipantsTable(participants) {
        // Clear any existing rows
        tableBody.innerHTML = '';
        
        // Check if participants data is empty
        if (!Array.isArray(participants) || participants.length === 0) {
            const noDataRow = `
                <tr>
                    <td colspan="4" class="no-data">该活动暂无参与者</td>
                </tr>
            `;
            tableBody.innerHTML = noDataRow;
            return;
        }
        
        // Enhanced CSS for improved table design
        const styleTag = document.createElement('style');
      
        document.head.appendChild(styleTag);
        
        // Add table class for new styling
        const table = document.querySelector('table');
        table.classList.add('participants-table');
        
        // Update table headers with more descriptive text
        const tableHeaders = document.querySelector('thead tr');
        tableHeaders.innerHTML = `
            <th>序号</th>
            <th>会员ID</th>
            <th>会员英文姓名</th>
            <th>会员华文姓名</th>   
            <th>会员电话</th>
            <th>会员邮箱</th>
            <th>会员IC</th>
            <th>事件ID</th>
            <th>加入活动日期</th>
            <th>操作</th>
        `;

        // Populate table with enhanced participant data
        participants.forEach((participant ) => {
            // Get member info if available   
            const row = document.createElement('tr');
            const sequentialNumber =participant.ID;
            const displayMemberId = participant.memberID || 'N/A';
            const englishName = participant.Name || 'N/A';
            const chineseName = participant.CName || 'N/A';
            const phoneNumber = participant.phone_number || 'N/A';
            const email = participant.email || 'N/A';
            const ic = participant.IC || 'N/A';

            row.innerHTML = `
                 <td>${sequentialNumber}</td>
            <td class="member-id">${escapeHTML(displayMemberId)}</td>
            <td class="member-name">${escapeHTML(englishName)}</td>
            <td class="member-cname">${escapeHTML(chineseName)}</td>
            <td class="member-phone">${escapeHTML(phoneNumber)}</td>
            <td class="member-email">${escapeHTML(email)}</td>
            <td class="member-ic">${escapeHTML(ic)}</td>
            <td class="event-id">${escapeHTML(participant.eventID || 'N/A')}</td>
            <td class="join-date">${formatDate(participant.joined_at)}</td>
            <td>
                    <button class="delete-btn" 
                            data-participant-id="${participant.ID}" 
                            data-member-id="${participant.memberID}" 
                            data-event-id="${participant.eventID}">
                        删除
                    </button>
                </td>
            `;

              // Add event listener for delete button
              const deleteBtn = row.querySelector('.delete-btn');
              deleteBtn.addEventListener('click', () => deleteParticipant(participant));

              tableBody.appendChild(row);
        });
    }
    
    async function deleteParticipant(participant) {
        const memberIdToDisplay = participant.membersID ||  'N/A';
        // Confirm deletion
        const confirmDelete = confirm(`确定要删除该参与者吗？\n会员ID: ${memberIdToDisplay}\n事件ID: ${participant.eventID}`);
        
        if (!confirmDelete) return;
        
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE_URL}?table=participants&action=delete&ID=${participant.ID}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
               
            });
            
            if (!response.ok) {
                throw new Error(`删除失败: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                
                // Show success message
                showError('参与者删除成功');
                
                // Optionally, reload participants to ensure accurate count
                fetchParticipants(eventId);
            } else {
                // Handle unsuccessful deletion
                showError(result.message || '删除参与者失败');
            }
        } catch (error) {
            console.error('删除参与者时出错:', error);
            showError(`删除失败: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    // 打开会员搜索模态框
    function openMemberSearchModal() {
        memberSearchModal.style.display = 'block';
        modalSearchInput.focus();
        modalSearchInput.value = '';
        modalResultsBody.innerHTML = '';
        modalNoResults.style.display = 'none';
        modalPagination.innerHTML = '';
        
        // 初始加载会员列表
        performModalSearch(1);
    }
    
    // 执行会员搜索
    async function performModalSearch(page = 1) {
        const searchTerm = modalSearchInput.value.trim();
        const limit = 10; // 每页显示数量
        
        // 清空之前的结果
        modalResultsBody.innerHTML = '';
        modalNoResults.style.display = 'none';
        modalPagination.innerHTML = '';
        
        // 显示加载指示器
        modalLoadingIndicator.style.display = 'block';
        
        try {
            // 构建API请求URL
            let apiUrl = `${API_BASE_URL}?table=members&limit=${limit}&page=${page}`;
            
            // 如果有搜索词，添加搜索参数
            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
                 //apiUrl += '&searchFields=ID,Name,CName,phone_number';
            }
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`搜索失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 隐藏加载指示器
            modalLoadingIndicator.style.display = 'none';
            
            // 处理搜索结果
            if (data.data && data.data.length > 0) {
                // 显示会员列表
                displayModalResults(data.data);
                
                // 更新分页
                updateModalPagination(data.pagination, page);
            } else {
                // 显示无结果消息
                modalNoResults.style.display = 'block';
            }
        } catch (error) {
            console.error('会员搜索错误:', error);
            modalLoadingIndicator.style.display = 'none';
            modalNoResults.textContent = `搜索出错: ${error.message}`;
            modalNoResults.style.display = 'block';
        }
    }
    
    // 显示模态框搜索结果
    function displayModalResults(members) {
        modalResultsBody.innerHTML = '';
        
        members.forEach(member => {
            const fullMemberId = member.membersID || '';
            const actualMemberId = member.ID || '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHTML(fullMemberId || '')}</td>
                <td>${escapeHTML(member.Name || '')}</td>
                <td>${escapeHTML(member.CName || '')}</td>
                <td>${escapeHTML(member.phone_number || '')}</td>
                <td>
                    <button class="select-btn" 
                    data-member-display-id="${fullMemberId}" 
                    data-member-actual-id="${actualMemberId}" 
                    data-member-name="${escapeHTML(member.Name || '')}">
                        选择
                    </button>
                </td>
            `;
            
            // 添加选择按钮点击事件
            const selectBtn = row.querySelector('.select-btn');
            selectBtn.addEventListener('click', () => selectMember({
                displayId: fullMemberId,
                actualId: actualMemberId
            }));
            
            modalResultsBody.appendChild(row);
        });
    }
    
    // 更新模态框分页
    function updateModalPagination(pagination, currentPage) {
        if (!pagination) return;
        
        modalPagination.innerHTML = '';
        
        const totalPages = Math.ceil(pagination.total / pagination.per_page);
        
        // 上一页按钮
        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = '上一页';
            prevButton.addEventListener('click', () => {
                performModalSearch(currentPage - 1);
            });
            modalPagination.appendChild(prevButton);
        }
        
        // 页码按钮
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => {
                performModalSearch(i);
            });
            modalPagination.appendChild(pageButton);
        }
        
        // 下一页按钮
        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = '下一页';
            nextButton.addEventListener('click', () => {
                performModalSearch(currentPage + 1);
            });
            modalPagination.appendChild(nextButton);
        }
    }
    
    // 选择会员并添加到活动
    // Function to select a member and add them to the event
// Modify the selectMember function to correctly store participant data
async function selectMember(member) {
    // Use the actual ID (not the display ID)
    const memberIdToUse = member.actualId;
    
    if (!memberIdToUse || memberIdToUse === '0' || memberIdToUse === 0) {
        showError('无效的会员ID，请选择有效的会员');
        return;
    }
    
    const confirmAdd = confirm(`确定要将会员 ${member.displayId || memberIdToUse} 添加到此活动吗？`);
    
    if (!confirmAdd) return;
    
    showLoading();
    
    try {
        // Check if member is already in the event using the correct ID field
        const checkResponse = await fetch(`${API_BASE_URL}?table=participants&search=true&eventID=${eventId}&memberID=${memberIdToUse}`);
        const checkData = await checkResponse.json();
        
        if (checkData.data && checkData.data.length > 0) {
            showError(`该会员已经添加到此活动中`);
            hideLoading();
            return;
        }
        
        // Create participant record with the correct memberID field
        const participantData = {
            table: 'participants',
            eventID: eventId,
            memberID: memberIdToUse,  // This is the key field that needs to be correct
            joined_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
        
        const response = await fetch(`${API_BASE_URL}?table=participants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(participantData)
        });
        
        if (!response.ok) {
            throw new Error(`添加失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            memberSearchModal.style.display = 'none';
            showError(`会员 ${member.displayId || memberIdToUse} 已成功添加到活动`);
            fetchParticipants(eventId);
        } else {
            throw new Error(result.message || '添加参与者失败');
        }
    } catch (error) {
        console.error('添加参与者时出错:', error);
        showError(`添加失败: ${error.message}`);
    } finally {
        hideLoading();
    }
}
    
    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Format date in a readable format
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }
    
    // Format date and time in a readable format
    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return 'N/A';
        
        try {
            const date = new Date(dateTimeStr.replace(' ', 'T'));
            if (isNaN(date.getTime())) return dateTimeStr;
            
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting datetime:', error);
            return dateTimeStr;
        }
    }
    
    // Show error message
    function showError(message) {
        errorContainer.innerHTML = message;
        errorContainer.style.display = 'block';
        
        // Hide error message after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
    
    // Show loading indicator
    function showLoading() {
        loadingIndicator.style.display = 'block';
    }
    
    // Hide loading indicator
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }
    
    // HTML escape function to prevent XSS attacks
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
});