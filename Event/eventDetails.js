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
    

     // Store selected members
     const selectedMembers = new Map();
    
     // Create Multi-select control panel
     const modalControlPanel = document.createElement('div');
     modalControlPanel.className = 'modal-control-panel';
     modalControlPanel.innerHTML = `
         <div class="selected-count">已选择: <span id="selectedMemberCount">0</span> 位会员</div>
         <div class="control-buttons">
             <button id="selectAllBtn" class="btn">全选</button>
             <button id="deselectAllBtn" class="btn">取消全选</button>
             <button id="addSelectedMembersBtn" class="btn btn-success" disabled>添加所选会员</button>
         </div>
     `;
     
     // Insert control panel after search container
     const searchContainer = document.querySelector('.search-container');
     if (searchContainer) {
         searchContainer.parentNode.insertBefore(modalControlPanel, searchContainer.nextSibling);
     }
     
     // Add event listeners for control panel buttons
     const selectAllBtn = document.getElementById('selectAllBtn');
     const deselectAllBtn = document.getElementById('deselectAllBtn');
     const addSelectedMembersBtn = document.getElementById('addSelectedMembersBtn');
     const selectedMemberCount = document.getElementById('selectedMemberCount');
     
     if (selectAllBtn) {
         selectAllBtn.addEventListener('click', selectAllMembers);
     }
     
     if (deselectAllBtn) {
         deselectAllBtn.addEventListener('click', deselectAllMembers);
     }
     
     if (addSelectedMembersBtn) {
         addSelectedMembersBtn.addEventListener('click', addSelectedMembers);
     }
     
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
            performModalSearch();
        });
    }
    
    // 搜索输入框回车事件
    if (modalSearchInput) {
        modalSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performModalSearch();
            }
        });
        
        // 输入时自动搜索（防抖）
        modalSearchInput.addEventListener('input', debounce(function() {
            performModalSearch();
        }, 300));
    }
    
    // 添加会员按钮点击事件
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', function() {
            openMemberSearchModal();
        });
    }
    
    // 打开会员搜索模态框
    function openMemberSearchModal() {
        // Clear previous search results and selections
        modalResultsBody.innerHTML = '';
        modalSearchInput.value = '';
        modalNoResults.style.display = 'none';
        selectedMembers.clear();
        updateSelectedCount();
        
        // Show the modal
        memberSearchModal.style.display = 'block';
        modalSearchInput.focus();
        
        // Perform initial search to show all members
        performModalSearch();
    }
    
    // 全选会员
    function selectAllMembers() {
        const checkboxes = document.querySelectorAll('#modalResultsBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            const memberId = checkbox.getAttribute('data-id');
            const memberName = checkbox.getAttribute('data-name');
            selectedMembers.set(memberId, memberName);
        });
        updateSelectedCount();
    }
    
    // 取消全选会员
    function deselectAllMembers() {
        const checkboxes = document.querySelectorAll('#modalResultsBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedMembers.clear();
        updateSelectedCount();
    }
    
    // 添加选中的会员
    async function addSelectedMembers() {
        if (selectedMembers.size === 0) {
            alert('请至少选择一位会员');
            return;
        }
        
        const confirmAdd = confirm(`确定要将选中的 ${selectedMembers.size} 位会员添加到此活动吗？`);
        if (!confirmAdd) return;
        
        showLoading();
        
        try {
            // Get event ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('id');
            
            if (!eventId) {
                throw new Error('无法获取活动ID');
            }
            
            let successCount = 0;
            let errorCount = 0;
            
            // For each selected member, create a participant record
            for (const [memberId, memberName] of selectedMembers.entries()) {
                try {
                    // Check if already added
                    const checkResponse = await fetch(`${API_BASE_URL}?table=vparticipants&search=true&eventID=${eventId}&membersID=${memberId}`);
                    const checkData = await checkResponse.json();
                    
                    if (checkData.data && checkData.data.length > 0) {
                        console.log(`会员 ${memberName} (ID: ${memberId}) 已经添加到此活动中`);
                        errorCount++;
                        continue;
                    }
                   
                    const participantData = {
                        table: 'participants',
                        eventID: eventId,
                        memberID: memberId,
                        joined_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                    };
                    
                    const response = await fetch(`${API_BASE_URL}?table=participants`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(participantData)
                    });
                   
                    const result = await response.json();
                
                    if (response.ok && result.status === 'success') {
                        successCount++;
                    } else {
                        throw new Error(result.message || '添加会员失败');
                    }
                } catch (error) {
                    console.error(`添加会员 ${memberName} 时出错:`, error);
                    errorCount++;
                }
            }
                    
                
                
             
            // Close the modal and refresh the participants list
            memberSearchModal.style.display = 'none';
            fetchParticipants(eventId);
            
            // Show success/error message
            let message = '';
            if (successCount > 0) {
                message += `成功添加 ${successCount} 位会员`;
            }
            if (errorCount > 0) {
                message += message ? `, ${errorCount} 位会员添加失败` : `${errorCount} 位会员添加失败`;
            }
            
            showError(message);
            
        } catch (error) {
            console.error('Error adding members:', error);
            showError(`添加会员失败: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    // 更新已选择会员数量
    function updateSelectedCount() {
        if (selectedMemberCount) {
            selectedMemberCount.textContent = selectedMembers.size;
        }
        
        // Enable/disable the add button based on selection
        if (addSelectedMembersBtn) {
            addSelectedMembersBtn.disabled = selectedMembers.size === 0;
        }
    }
    
    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    function updateReturnButtonUrl() {
        const returnButtons = document.querySelectorAll('.header-actions a.btn-secondary, .back-btn, a[href="searchEvent.html"]');
        
        if (returnButtons.length > 0) {
            // Then construct the return URL
            let returnUrl = 'searchEvent.html';
            const params = [];
            
            if (returnPage) params.push(`page=${returnPage}`);
            if (returnQuery) params.push(`query=${encodeURIComponent(returnQuery)}`);
            if (returnStatus) params.push(`status=${returnStatus}`);
            
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
        
        // Insert event details before the members table
        const container = document.querySelector('.container');
        container.insertBefore(eventDetailsSection, document.querySelector('h1').nextSibling);
        
        // Update page title
        document.querySelector('h1').textContent = '活动参与者列表';
        document.title = `${event.title} - 活动详情`;
    }
    
    // Fetch participants
    async function fetchParticipants(eventId) {
        showLoading();

        console.log("Fetching participants for event ID:", eventId);
        
        try {
            console.log(`Fetching participants for event ID: ${eventId}`);
            const response = await fetch(`${API_BASE_URL}?table=vparticipants&search=true&eventID=${eventId}`);
            if (!response.ok) {
                throw new Error(`Loading failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Loaded participants data:', data);
            
          
            if (data.data && data.data.length > 0) {
                // Filter participants for this event
                const validParticipants = data.data.filter(participant => participant.eventID == eventId);
                populateParticipantsTable(validParticipants);
            } else {
                // If no data in vparticipants, try the original participants table as fallback
                const fallbackResponse = await fetch(`${API_BASE_URL}?table=participants&search=true&eventID=${eventId}`);
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.data && fallbackData.data.length > 0) {
                        // Need to fetch member info for each participant
                        const participantsWithMemberInfo = await Promise.all(
                            fallbackData.data.map(async (participant) => {
                                if (participant.memberID) {
                                    try {
                                        const memberResponse = await fetch(`${API_BASE_URL}?table=members&search=true&ID=${participant.memberID}`);
                                        if (memberResponse.ok) {
                                            const memberData = await memberResponse.json();
                                            if (memberData.data && memberData.data.length > 0) {
                                                return { ...participant, ...memberData.data[0] };
                                            }
                                        }
                                    } catch (error) {
                                        console.error(`Error fetching member data:`, error);
                                    }
                                }
                                return participant;
                            })
                        );
                        populateParticipantsTable(participantsWithMemberInfo);
                    } else {
                        populateParticipantsTable([]);
                    }
                } else {
                    populateParticipantsTable([]);
                }
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
                    <td colspan="10" class="no-data">该活动暂无参与者</td>
                </tr>
            `;
            tableBody.innerHTML = noDataRow;
            return;
        }

        console.log("Sample participant data:", participants[0]);
    
        // Populate table with enhanced participant data
        participants.forEach((participant) => {
            // Get member info if available   
            const row = document.createElement('tr');
            const sequentialNumber = participant.ID;
            const displayMemberId = participant.membersID || participant.memberID || 'N/A';
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
                            data-member-id="${participant.membersID || participant.memberID}"
                            data-event-id="${participant.eventID}">
                        删除
                    </button>
                </td>
            `;

            // Add event listener for delete button
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteParticipant(participant));
            console.log('Delete button clicked for participant:', participant);
            tableBody.appendChild(row);
        });
    }
    
    async function deleteParticipant(participant) {
        // Extract necessary IDs for deletion
        const eventId = participant.eventID;
        
        // For display purposes only
        const displayMemberId = participant.membersID || participant.memberID || 'N/A';
        const memberName = participant.Name || participant.CName || 'N/A';
        
        // We need to extract the actual numeric ID that the database uses
        // This could be stored in different properties depending on your API response
        const numericParticipantId = participant.ID;
        
        console.log('Deletion attempt for participant:', participant);
    
        if (!numericParticipantId) {
            showError('无法找到参与者记录ID');
            return;
        }
    
        // Confirm deletion with user
        const confirmDelete = confirm(`确定要删除该参与者吗？\n会员ID: ${displayMemberId}\n会员姓名: ${memberName}`);
        
        if (!confirmDelete) return;
        
        showLoading();
        
        try {
            // First, get the actual record from participants table to ensure we have the correct IDs
            const getParticipantResponse = await fetch(`${API_BASE_URL}?table=participants&search=true&ID=${numericParticipantId}`);
            const participantData = await getParticipantResponse.json();
            
            // Check if we found the participant record
            if (!participantData.data || participantData.data.length === 0) {
                // Try searching by event and member
                const altSearchResponse = await fetch(`${API_BASE_URL}?table=participants&search=true&eventID=${eventId}`);
                const altParticipantData = await altSearchResponse.json();
                
                // Filter to find the correct participant
                const matchingParticipants = altParticipantData.data?.filter(p => 
                    (p.memberID == participant.memberID || p.memberID == participant.ID_members)
                );
                
                if (matchingParticipants && matchingParticipants.length > 0) {
                    // Use the first matching participant
                    const actualParticipant = matchingParticipants[0];
                    console.log('Found participant record:', actualParticipant);
                    
                    // Now delete using the actual ID from participants table
                    const deleteResponse = await fetch(`${API_BASE_URL}?table=participants&action=delete&ID=${actualParticipant.ID}`, {
                        method: 'DELETE'
                    });
                    
                    const deleteResult = await deleteResponse.json();
                    
                    if (deleteResponse.ok && deleteResult.status === 'success') {
                        showError('参与者删除成功');
                        fetchParticipants(eventId);
                        return;
                    } else {
                        throw new Error(deleteResult.message || '删除参与者失败');
                    }
                } else {
                    throw new Error('找不到对应的参与者记录');
                }
            } else {
                // We found the participant record directly
                const actualParticipant = participantData.data[0];
                console.log('Found participant record:', actualParticipant);
                
                // Delete using the actual ID
                const deleteResponse = await fetch(`${API_BASE_URL}?table=participants&action=delete&ID=${actualParticipant.ID}`, {
                    method: 'DELETE'
                });
                
                const deleteResult = await deleteResponse.json();
                
                if (deleteResponse.ok && deleteResult.status === 'success') {
                    showError('参与者删除成功');
                    fetchParticipants(eventId);
                    return;
                } else {
                    throw new Error(deleteResult.message || '删除参与者失败');
                }
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
        modalResultsBody.innerHTML = '';
        modalSearchInput.value = '';
        modalNoResults.style.display = 'none';
        selectedMembers.clear();
        updateSelectedCount();
        
        // Show the modal
        memberSearchModal.style.display = 'block';
        modalSearchInput.focus();
        
        // Perform initial search to show all members
        performModalSearch();
    }
    
    // 执行会员搜索
    async function performModalSearch() {
        // 隐藏加载指示器
        const searchTerm = modalSearchInput.value.trim();
        const limit = 1000000; // 每页显示数量
        // 显示加载指示器
        modalLoadingIndicator.style.display = 'block';
        // 隐藏无结果提示
        modalNoResults.style.display = 'none';
        
        try {
            // 构建API请求URL
            let apiUrl = `${API_BASE_URL}?table=members&limit=${limit}`;
            
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
            modalResultsBody.innerHTML = '';
            
            // 处理搜索结果
            if (data.data && data.data.length > 0) {
                // 显示会员列表
                displayModalResults(data.data);
                
                
            } else {
                // 显示无结果消息
                modalNoResults.style.display = 'block';
               
            }
        } catch (error) {
            console.error('Search error:', error);
            modalResultsBody.innerHTML = `<tr><td colspan="5" class="error">搜索出错: ${error.message}</td></tr>`;
   
        }finally {
            // 隐藏加载指示器
            modalLoadingIndicator.style.display = 'none'; 
        }

    }
    
    // 显示模态框搜索结果
    function displayModalResults(members) {
        modalResultsBody.innerHTML = '';
        
        members.forEach(member => {
            const memberId = member.ID || '';
            const displayId = member.membersID || memberId;
            const memberName = member.Name || member.CName || 'Unknown';
            const isSelected = selectedMembers.has(memberId);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHTML(displayId || '')}</td>
                <td>${escapeHTML(member.Name || '')}</td>
                <td>${escapeHTML(member.CName || '')}</td>
                <td>${escapeHTML(member.phone_number || '')}</td>
                <td>
                    <label class="checkbox-container">
                    <input type="checkbox" 
                           data-id="${memberId}" 
                           data-name="${escapeHTML(memberName)}" 
                           ${isSelected ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                </td>
            `; 
            
            modalResultsBody.appendChild(row);
        });
        const checkboxes = document.querySelectorAll('#modalResultsBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const memberId = this.getAttribute('data-id');
                const memberName = this.getAttribute('data-name');
                
                if (this.checked) {
                    selectedMembers.set(memberId, memberName);
                } else {
                    selectedMembers.delete(memberId);
                }
                
                updateSelectedCount();
            });
        });
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
    }});