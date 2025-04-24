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
    const selectedMemberCount = document.getElementById('selectedMemberCount');

     // Store selected members
     const selectedMembers = new Map();
    
  
     const selectAllBtn = document.getElementById('selectAllBtn');
     const deselectAllBtn = document.getElementById('deselectAllBtn');
     const addSelectedMembersBtn = document.getElementById('addSelectedMembersBtn');

     modalControlPanel.className = 'modal-control-panel';
     
     
     const tableContainer = document.querySelector('.table-responsive') || document.querySelector('table').parentNode;
     const searchContainer = document.createElement('div');
     searchContainer.className = 'participant-search-container mb-3';
     searchContainer.innerHTML = `
         <div class="input-group">
             <input type="text" id="participantSearchInput" class="form-control" placeholder="搜索塾员 (ID、姓名、电话、邮箱等)">
             <div class="input-group-append">
                 <button class="btn btn-outline-secondary" type="button" id="clearSearchBtn">
                     <i class="fas fa-times"></i> 清除
                 </button>
             </div>
         </div>
         <div class="mt-2">
             <div class="form-check form-check-inline">
                 <input class="form-check-input" type="checkbox" id="searchId" value="member-id" checked>
                 <label class="form-check-label" for="searchId">塾员ID</label>
             </div>
             <div class="form-check form-check-inline">
                 <input class="form-check-input" type="checkbox" id="searchName" value="member-name" checked>
                 <label class="form-check-label" for="searchName">英文名</label>
             </div>
             <div class="form-check form-check-inline">
                 <input class="form-check-input" type="checkbox" id="searchCName" value="member-cname" checked>
                 <label class="form-check-label" for="searchCName">中文名</label>
             </div>
             <div class="form-check form-check-inline">
                 <input class="form-check-input" type="checkbox" id="searchPhone" value="member-phone" checked>
                 <label class="form-check-label" for="searchPhone">电话</label>
             </div>
             <div class="form-check form-check-inline">
                 <input class="form-check-input" type="checkbox" id="searchEmail" value="member-email" checked>
                 <label class="form-check-label" for="searchEmail">邮箱</label>
             </div>
             <div class="form-check form-check-inline">
                 <input class="form-check-input" type="checkbox" id="searchIc" value="member-ic" checked>
                 <label class="form-check-label" for="searchIc">身份证号</label>
             </div>
         </div>
     `;
 
     // Insert the search container before the table
     tableContainer.parentNode.insertBefore(searchContainer, tableContainer);
 
     // Get references to elements
     const searchInput = document.getElementById('participantSearchInput');
     const clearButton = document.getElementById('clearSearchBtn');
    
     const noResultsRow = document.createElement('tr');
     noResultsRow.id = 'noResultsRow';
     noResultsRow.innerHTML = '<td colspan="10" class="text-center">没有找到匹配的记录</td>';
     noResultsRow.style.display = 'none';
     tableBody.appendChild(noResultsRow);
 
     // Add event listeners
     searchInput.addEventListener('input', performSearch);
     clearButton.addEventListener('click', clearSearch);
     
     // Get all filter checkboxes
     const filterCheckboxes = document.querySelectorAll('.form-check-input');
     filterCheckboxes.forEach(checkbox => {
         checkbox.addEventListener('change', performSearch);
     });
 
     // Function to perform search
     function performSearch() {
         const searchTerm = searchInput.value.trim().toLowerCase();
         const rows = tableBody.querySelectorAll('tr:not(#noResultsRow)');
         let hasVisibleRows = false;
 
         // Get selected search fields
         const selectedFields = Array.from(filterCheckboxes)
             .filter(checkbox => checkbox.checked)
             .map(checkbox => checkbox.value);
 
         // If no fields are selected, show all rows
         if (selectedFields.length === 0) {
             rows.forEach(row => row.style.display = '');
             noResultsRow.style.display = 'none';
             return;
         }
 
         rows.forEach(row => {
             if (row.classList.contains('no-data')) {
                 row.style.display = searchTerm ? 'none' : '';
                 return;
             }
 
             let matchFound = false;
             if (searchTerm === '') {
                 matchFound = true;
             } else {
                 // Check each selected field for matches
                 selectedFields.forEach(field => {
                     const cell = row.querySelector(`.${field}`);
                     if (cell && cell.textContent.toLowerCase().includes(searchTerm)) {
                         matchFound = true;
                     }
                 });
             }
 
             // Show or hide the row based on the match
             row.style.display = matchFound ? '' : 'none';
             
             if (matchFound) {
                 hasVisibleRows = true;
             }
         });
 
         // Show or hide the "no results" message
         noResultsRow.style.display = (hasVisibleRows || searchTerm === '') ? 'none' : '';
     }
 
     // Function to clear search
     function clearSearch() {
         searchInput.value = '';
         performSearch();
         searchInput.focus();
     }

     // Insert control panel after search container
    
     if (searchContainer) {
         searchContainer.parentNode.insertBefore(modalControlPanel, searchContainer.nextSibling);
     }
     
     
   
     
     
  


const headerActions = document.querySelector('.header-actions');
const exportTableBtn = document.createElement('button');
exportTableBtn.id = 'exportTableBtn';
exportTableBtn.className = 'btn btn-success';
exportTableBtn.innerHTML = '<i class="fas fa-file-export"></i> 导出名单';
exportTableBtn.title = '导出参与者名单';
headerActions.appendChild(exportTableBtn);



if (exportTableBtn) {
    exportTableBtn.addEventListener('click', async () => {
        // Create and show format selection modal
        const formatModal = document.createElement('div');
        formatModal.className = 'modal';
        formatModal.style.display = 'block';
        formatModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>选择要导出的数据列</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="export-format">
                        <p>选择导出格式:</p>
                        <label>
                            <input type="radio" name="exportFormat" value="xlsx" checked> XLSX (Excel)
                        </label>
                        <label>
                            <input type="radio" name="exportFormat" value="csv"> CSV
                        </label>
                    </div>
                    <div class="column-selection">
                        <div class="select-actions">
                            <button class="btn btn-secondary" id="selectAll">全选</button>
                            <button class="btn btn-secondary" id="deselectAll">取消全选</button>
                        </div>
                        <div class="columns-grid">
                            <label><input type="checkbox" value="序号" checked> 序号</label>
                            <label><input type="checkbox" value="塾员ID" checked> 塾员ID</label>
                            <label><input type="checkbox" value="英文名" checked> 英文名</label>
                            <label><input type="checkbox" value="中文名" checked> 中文名</label>
                            <label><input type="checkbox" value="电话" checked> 电话</label>
                            <label><input type="checkbox" value="邮箱" checked> 邮箱</label>
                            <label><input type="checkbox" value="身份证号" checked> 身份证号</label>
                            <label><input type="checkbox" value="活动ID" checked> 活动ID</label>
                            <label><input type="checkbox" value="加入时间" checked> 加入时间</label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="confirmExport">导出</button>
                    <button class="btn btn-secondary" id="cancelExport">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(formatModal);

        // Add event listeners for the modal
        const closeBtn = formatModal.querySelector('.close');
        const selectAllBtn = formatModal.querySelector('#selectAll');
        const deselectAllBtn = formatModal.querySelector('#deselectAll');
        const confirmBtn = formatModal.querySelector('#confirmExport');
        const cancelBtn = formatModal.querySelector('#cancelExport');
        const checkboxes = formatModal.querySelectorAll('.columns-grid input[type="checkbox"]');

        closeBtn.onclick = () => document.body.removeChild(formatModal);
        cancelBtn.onclick = () => document.body.removeChild(formatModal);

        selectAllBtn.onclick = () => checkboxes.forEach(cb => cb.checked = true);
        deselectAllBtn.onclick = () => checkboxes.forEach(cb => cb.checked = false);

        confirmBtn.onclick = async () => {
            const format = formatModal.querySelector('input[name="exportFormat"]:checked').value;
            const selectedColumns = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            if (selectedColumns.length === 0) {
                alert('请至少选择一个导出列');
                return;
            }

            document.body.removeChild(formatModal);
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('id');
            if (eventId) {
                await exportParticipantsList(eventId, format, selectedColumns);
            } else {
                showError('无法获取活动ID');
            }
        };
    });
}
const searchPlaceholder = document.getElementById('search-container-placeholder');
if (searchPlaceholder) {
    searchPlaceholder.appendChild(searchContainer);
} else {
    // Fallback to original location
    tableContainer.parentNode.insertBefore(searchContainer, tableContainer);
}

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
            alert('请至少选择一位塾员');
            return;
        }
        
        const confirmAdd = confirm(`确定要将选中的 ${selectedMembers.size} 位塾员添加到此活动吗？`);
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
                        console.log(`塾员 ${memberName} (ID: ${memberId}) 已经添加到此活动中`);
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
                        throw new Error(result.message || '添加塾员失败');
                    }
                } catch (error) {
                    console.error(`添加塾员 ${memberName} 时出错:`, error);
                    errorCount++;
                }
            }
                    
                
                
             
            // Close the modal and refresh the participants list
            memberSearchModal.style.display = 'none';
            fetchParticipants(eventId);
            
            // Show success/error message
            let message = '';
            if (successCount > 0) {
                message += `成功添加 ${successCount} 位塾员`;
            }
            if (errorCount > 0) {
                message += message ? `, ${errorCount} 位塾员添加失败` : `${errorCount} 位塾员添加失败`;
            }
            
            showError(message);
            
        } catch (error) {
            console.error('Error adding members:', error);
            showError(`添加塾员失败: ${error.message}`);
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
            const response = await fetch(`${API_BASE_URL}?table=vparticipants&search=true&eventID=${eventId}&limit=100000`);
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
                const fallbackResponse = await fetch(`${API_BASE_URL}?table=participants&search=true&eventID=${eventId}&limit=100000`);
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
        const confirmDelete = confirm(`确定要删除该参与者吗？\n塾员ID: ${displayMemberId}\n塾员姓名: ${memberName}`);
        
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
            const row = document.createElement('tr');
            const isSelected = selectedMembers.has(member.ID);
            
            row.innerHTML = `
                <td>${member.ID || '-'}</td>
                <td>${member.Name || '-'}</td>
                <td>${member.CName || '-'}</td>
                <td>${member.phone_number || '-'}</td>
                <td>
                  <input type="checkbox" class="member-checkbox" data-id="${member.ID}" data-name="${member.Name}" 
                        ${isSelected ? 'checked' : ''}>
                </td>
            `;
            
            // Add checkbox event listener
            const checkbox = row.querySelector('.member-checkbox');
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
        updateSelectedCount();
    }
 
    function updateSelectedCount() {
        const selectedMemberCount = document.getElementById('selectedMemberCount');
        if (selectedMemberCount) {
            selectedMemberCount.textContent = selectedMembers.size;
            
            // Enable/disable the add button based on selection
            const addSelectedMembersBtn = document.getElementById('addSelectedMembersBtn');
            if (addSelectedMembersBtn) {
                addSelectedMembersBtn.disabled = selectedMembers.size === 0;
            }
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
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    }
    
    // Hide loading indicator
    function hideLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
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

    async function exportParticipantsList(eventId, format, selectedColumns) {
        try {
            showLoading();
            console.log("Starting export process...");
            console.log("Event ID:", eventId);
            console.log("Format:", format);
            console.log("Selected columns:", selectedColumns);
            
            // Check for XLSX library if Excel format is selected
            if (format === 'xlsx') {
                if (typeof XLSX === 'undefined') {
                    alert('Excel导出库未加载。请添加SheetJS库或选择CSV格式。');
                    console.error("XLSX library not found");
                    format = 'csv'; // Fallback to CSV
                } else {
                    console.log("XLSX library found and ready");
                }
            }
    
            // Fetch participants data
            console.log(`Fetching participants for event ID: ${eventId}`);
            const response = await fetch(`${API_BASE_URL}?table=vparticipants&search=true&eventID=${eventId}&limit=100000`);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API response:", data);
            
            if (!data.data) {
                console.error("Invalid API response format:", data);
                throw new Error('API返回数据格式无效');
            }
            
            // Check raw data from API
            console.log("All participants from API:", data.data);
            
            // Try different filters to identify the issue
            if (Array.isArray(data.data)) {
                // Check if we have any participants at all
                console.log(`Total participants in API response: ${data.data.length}`);
                
                // Check different formats of eventID
                const eventIdAsString = String(eventId);
                const eventIdAsNumber = Number(eventId);
                
                const byStringMatch = data.data.filter(p => String(p.eventID) === eventIdAsString);
                const byNumberMatch = data.data.filter(p => Number(p.eventID) === eventIdAsNumber);
                
                console.log(`Participants matching eventID as string (${eventIdAsString}): ${byStringMatch.length}`);
                console.log(`Participants matching eventID as number (${eventIdAsNumber}): ${byNumberMatch.length}`);
                
                // Check for any eventID values in the data
                const uniqueEventIds = [...new Set(data.data.map(p => p.eventID))];
                console.log("Unique event IDs in data:", uniqueEventIds);
                
                // Use the match that works
                const eventParticipants = byStringMatch.length > 0 ? byStringMatch : 
                                          byNumberMatch.length > 0 ? byNumberMatch : [];
                
                console.log(`Final participants count for this event: ${eventParticipants.length}`);
                
                if (eventParticipants.length === 0) {
                    // Try to get participants from regular participants table as fallback
                    console.log("Attempting to fetch from participants table as fallback");
                    const fallbackResponse = await fetch(`${API_BASE_URL}?table=participants&search=true&eventID=${eventId}&limit=100000`);
                    const fallbackData = await fallbackResponse.json();
                    console.log("Fallback API response:", fallbackData);
                    
                    if (fallbackData.data && fallbackData.data.length > 0) {
                        // Process participants with incomplete data
                        console.log(`Found ${fallbackData.data.length} participants in fallback table`);
                        
                        // Enrich with member data if possible
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
                        
                        // Use this data instead
                        console.log("Enriched participants data:", participantsWithMemberInfo);
                        prepareAndExportData(participantsWithMemberInfo, eventId, format, selectedColumns);
                        return;
                    } else {
                        throw new Error('未找到此活动的参与者');
                    }
                } else {
                    // Proceed with export
                    prepareAndExportData(eventParticipants, eventId, format, selectedColumns);
                }
            } else {
                throw new Error('API返回的数据不是有效的数组');
            }
        } catch (error) {
            console.error('Export error:', error);
            showError(`导出失败: ${error.message}`);
        } finally {
            hideLoading();
        }
    
        // Helper function to prepare and export data
        async function prepareAndExportData(participants, eventId, format, selectedColumns) {
            try {
                // Create array for export with proper column mapping
                const exportData = [];
                
                // Add each participant as a row in the export data
                participants.forEach((participant, index) => {
                    const row = {};
                    
                    // Map the selected columns to participant data
                    selectedColumns.forEach(column => {
                        switch(column) {
                            case '序号':
                                row[column] = index + 1;
                                break;
                            case '塾员ID':
                                row[column] = participant.membersID || participant.memberID || '';
                                break;
                            case '英文名':
                                row[column] = participant.Name || '';
                                break;
                            case '中文名':
                                row[column] = participant.CName || '';
                                break;
                            case '电话':
                                row[column] = participant.phone_number || '';
                                break;
                            case '邮箱':
                                row[column] = participant.email || '';
                                break;
                            case '身份证号':
                                row[column] = participant.IC || '';
                                break;
                            case '活动ID':
                                row[column] = participant.eventID || '';
                                break;
                            case '加入时间':
                                row[column] = participant.joined_at ? formatDateTime(participant.joined_at) : '';
                                break;
                            default:
                                row[column] = '';
                        }
                    });
                    exportData.push(row);
                });
                
                console.log("Prepared export data:", exportData);
        
                // Get event title for filename
                const eventResponse = await fetch(`${API_BASE_URL}?table=event&search=true&ID=${eventId}`);
                const eventData = await eventResponse.json();
                const eventTitle = eventData.data?.[0]?.title || 'event';
                
                // Generate filename with sanitized event title (remove special characters)
                const safeTitle = eventTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const filename = `${safeTitle}_participants_${timestamp}`;
        
                if (format === 'xlsx' && typeof XLSX !== 'undefined') {
                    // Excel export
                    console.log("Starting Excel export...");
                    
                    try {
                        // Create workbook and worksheet
                        const wb = XLSX.utils.book_new();
                        
                        // Convert JSON to worksheet
                        console.log("Converting data to worksheet format");
                        const ws = XLSX.utils.json_to_sheet(exportData);
                        
                        // Add worksheet to workbook
                        XLSX.utils.book_append_sheet(wb, ws, "Participants");
                        
                        console.log("Writing Excel file:", filename);
                        XLSX.writeFile(wb, `${filename}.xlsx`);
                        
                        console.log("Excel export completed successfully");
                        showError('Excel导出成功');
                    } catch (xlsxError) {
                        console.error("Excel export error:", xlsxError);
                        throw new Error(`Excel导出失败: ${xlsxError.message}`);
                    }
                } else {
                    // CSV export
                    console.log("Starting CSV export...");
                    
                    try {
                        // Create CSV content
                        let csvContent = '';
                        
                        // Add header row
                        csvContent += selectedColumns.join(',') + '\n';
                        
                        // Add data rows
                        exportData.forEach(row => {
                            const csvRow = selectedColumns.map(column => {
                                let cellValue = row[column] || '';
                                // Escape quotes and wrap in quotes
                                cellValue = String(cellValue).replace(/"/g, '""');
                                return `"${cellValue}"`;
                            });
                            csvContent += csvRow.join(',') + '\n';
                        });
                        
                        // Create blob with BOM for UTF-8
                        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], 
                            { type: 'text/csv;charset=utf-8' });
                        
                        // Create download link
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `${filename}.csv`;
                        
                        console.log("Starting CSV download");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);
                        
                        console.log("CSV export completed successfully");
                        showError('CSV导出成功');
                    } catch (csvError) {
                        console.error("CSV export error:", csvError);
                        throw new Error(`CSV导出失败: ${csvError.message}`);
                    }
                }
            } catch (error) {
                throw error;
            }
        }
    
    }

});

    
    
