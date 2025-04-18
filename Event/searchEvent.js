const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';

document.head.innerHTML += '<script src="https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js"></script>';
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const eventTableBody = document.querySelector("#eventTable tbody");
    const totalEvents = document.getElementById("totalEvents");
    const loader = document.querySelector(".loader");
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const paginationContainer = document.querySelector(".pagination");
    const table = document.getElementById('eventTable');
    const tableHeaders = table.querySelectorAll('th');
    const pageInput = document.getElementById('pageInput');
    const jumpButton = document.getElementById('jumpButton');
    const exportButton = document.getElementById('exportButton');
    const dateFilterButton = document.getElementById('dateFilterButton');
    const systemNav = document.querySelector('.system-nav');
    const statusFilterButton = document.getElementById('statusFilterButton');
    const endTimeFilterButton = document.getElementById('endTimeFilterButton');
    const priceFilterButton = document.getElementById('priceFilterButton');
    const listAllButton = document.createElement('button');
    const resetColumnWidthButton = document.getElementById('resetColumnWidthButton');

    listAllButton.className = 'btn btn-secondary tooltip';
    listAllButton.innerHTML = '<i class="fas fa-list"></i> 列出所有';
    const tooltipSpan = document.createElement('span');
    tooltipSpan.className = 'tooltip-text';
    tooltipSpan.textContent = '显示所有数据';
    listAllButton.appendChild(tooltipSpan);
    systemNav.appendChild(listAllButton);

    if (resetColumnWidthButton) {
        resetColumnWidthButton.addEventListener('click', function() {
            // Clear saved column widths from localStorage
            localStorage.removeItem('eventTableColumnWidths');
            
            // Reset all column widths to their default values
            tableHeaders.forEach(th => {
                th.style.width = ''; // 移除内联宽度设置
                th.style.position = 'relative';
            });
            
            // Reinitialize the resizers
            initializeColumnResizers();

            const savedWidths = JSON.parse(localStorage.getItem('eventTableColumnWidths') || '{}');
            tableHeaders.forEach((th, index) => {
                if (savedWidths[index]) {
                    th.style.width = savedWidths[index] + 'px';
                }
            });
            
            // Show feedback to the user
            alert('列宽已重置为默认值');
        });
    }

    function initializeColumnResizers() {
        console.log('Initializing column resizers...');
        tableHeaders.forEach((th, index) => {
            if (index === tableHeaders.length - 1) return; // Skip last column
    
            console.log(`Setting up resizer for column ${index}`);
            // 移除已存在的 resizer
            const existingResizer = th.querySelector('.resizer');
            if (existingResizer) {
                existingResizer.remove();
            }
    
            // 创建新的 resizer
            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            th.appendChild(resizer);
            th.style.position = 'relative';
    
            let isResizing = false;
            let startX, startWidth;

            const minWidths = {
                0: 60,  // 序
                1: 150, // 标题
                2: 80,  // 状态
                3: 120, // 开始时间
                4: 120, // 结束时间
                5: 120, // 创建时间
                6: 100, // 地点
                7: 150, // 描述
                8: 80,  // 参与者数量
                9: 120, // 报名截止
                10: 80, // 价格
                11: 120, // 在线链接
                12: 220  // 操作
            };
    
            resizer.addEventListener('mousedown', function(e) {
                console.log(`Resizer mousedown on column ${index}`);
                isResizing = true;
                startX = e.pageX;
                startWidth = th.offsetWidth;
                
                // 添加调整中的类，改变表格样式
                table.classList.add('resizing');
                
                // 添加全局事件监听器
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                
                e.preventDefault();
            });
    
            function handleMouseMove(e) {
                if (!isResizing) return;
            
            const width = Math.max(startWidth + (e.pageX - startX), minWidths[index] || 80);
            th.style.width = `${width}px`;
            
            const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
            cells.forEach(cell => {
                cell.style.width = `${width}px`;
            });

            // Save to localStorage
            const savedWidths = JSON.parse(localStorage.getItem('eventTableColumnWidths') || '{}');
            savedWidths[index] = width;
            localStorage.setItem('eventTableColumnWidths', JSON.stringify(savedWidths));
            }
    
            function handleMouseUp() {
                isResizing = false;
                table.classList.remove('resizing');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
        });
    }

    function loadSavedColumnWidths() {
        const savedWidths = JSON.parse(localStorage.getItem('eventTableColumnWidths') || '{}');
        tableHeaders.forEach((th, index) => {
            if (savedWidths[index]) {
                th.style.width = `${savedWidths[index]}px`;
                const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
                cells.forEach(cell => {
                    cell.style.width = `${savedWidths[index]}px`;
                });
            }
        });
    }

    // Add List All button event listener
    listAllButton.addEventListener('click', function() {
        // Reset all filters
        currentSearchQuery = "";
        currentStartDate = "";
        currentEndDate = "";
        currentEndTimeStartDate = "";
        currentEndTimeEndDate = "";
        currentStatuses = [];
        currentStartPrice = "";
        currentEndPrice = "";
        currentPage = 1;
        
        // Clear search input if it exists
        if (searchInput) {
            searchInput.value = "";
        }
        
        // Fetch all events
        fetchEvents();
    });

    let currentSortColumn = null;
    let currentSortOrder = null;
    let eventData = [];
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    let currentPage = 1;
    let totalPages = 0;
    let currentSearchQuery = "";
    let currentStartDate = "";
    let currentEndDate = ""; 
    let currentEndTimeStartDate = ""; 
    let currentEndTimeEndDate = "";   
    let currentStatuses = [];
    let currentStartPrice = "";
    let currentEndPrice = "";

   

  

    if (priceFilterButton) {
        priceFilterButton.addEventListener('click', function() {
            const filterModal = document.createElement('div');
            filterModal.className = 'modal';
            filterModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>选择价格范围</h3>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="price-filter-form">
                            <div class="price-input-group">
                                <label>最低价格 (RM):</label>
                                <input type="number" min="0" step="0.01" id="startPrice" value="${currentStartPrice}">
                            </div>
                            <div class="price-input-group">
                                <label>最高价格 (RM):</label>
                                <input type="number" min="0" step="0.01" id="endPrice" value="${currentEndPrice}">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="clearPriceFilter">清除筛选</button>
                        <button class="btn btn-primary" id="applyPriceFilter">应用</button>
                        <button class="btn btn-secondary" id="cancelPriceFilter">取消</button>
                    </div>
                </div>
            `;

            document.body.appendChild(filterModal);

            const closeBtn = filterModal.querySelector('.close');
            const cancelBtn = filterModal.querySelector('#cancelPriceFilter');
            const applyBtn = filterModal.querySelector('#applyPriceFilter');
            const clearBtn = filterModal.querySelector('#clearPriceFilter');

            closeBtn.onclick = () => document.body.removeChild(filterModal);
            cancelBtn.onclick = () => document.body.removeChild(filterModal);

            clearBtn.onclick = () => {
                currentStartPrice = "";
                currentEndPrice = "";
                document.body.removeChild(filterModal);
                currentPage = 1;
                fetchEvents(currentSearchQuery, currentStatuses);
            };

            applyBtn.onclick = () => {
                const startPrice = filterModal.querySelector('#startPrice').value;
                const endPrice = filterModal.querySelector('#endPrice').value;

                if (startPrice && endPrice && parseFloat(startPrice) > parseFloat(endPrice)) {
                    alert('最低价格不能大于最高价格');
                    return;
                }

                currentStartPrice = startPrice;
                currentEndPrice = endPrice;
                
                document.body.removeChild(filterModal);
                currentPage = 1;
                fetchEvents(currentSearchQuery, currentStatuses);
            };
        });
    }

    if (endTimeFilterButton) {
        endTimeFilterButton.addEventListener('click', function() {
            const filterModal = document.createElement('div');
            filterModal.className = 'modal';
            filterModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>选择结束时间范围</h3>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="date-filter-form">
                            <div class="date-input-group">
                                <label>开始日期:</label>
                                <input type="date" id="endTimeStartDate" value="${currentEndTimeStartDate}">
                            </div>
                            <div class="date-input-group">
                                <label>结束日期:</label>
                                <input type="date" id="endTimeEndDate" value="${currentEndTimeEndDate}">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="clearEndTimeFilter">清除筛选</button>
                        <button class="btn btn-primary" id="applyEndTimeFilter">应用</button>
                        <button class="btn btn-secondary" id="cancelEndTimeFilter">取消</button>
                    </div>
                </div>
            `;

            document.body.appendChild(filterModal);

            const closeBtn = filterModal.querySelector('.close');
            const cancelBtn = filterModal.querySelector('#cancelEndTimeFilter');
            const applyBtn = filterModal.querySelector('#applyEndTimeFilter');
            const clearBtn = filterModal.querySelector('#clearEndTimeFilter');

            closeBtn.onclick = () => document.body.removeChild(filterModal);
            cancelBtn.onclick = () => document.body.removeChild(filterModal);

            clearBtn.onclick = () => {
                currentEndTimeStartDate = "";
                currentEndTimeEndDate = "";
                document.body.removeChild(filterModal);
                currentPage = 1;
                fetchEvents(currentSearchQuery, currentStatuses);
            };

            applyBtn.onclick = () => {
                const startDate = filterModal.querySelector('#endTimeStartDate').value;
                const endDate = filterModal.querySelector('#endTimeEndDate').value;

                if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                    alert('开始日期不能大于结束日期');
                    return;
                }

                currentEndTimeStartDate = startDate;
                currentEndTimeEndDate = endDate;
                
                document.body.removeChild(filterModal);
                currentPage = 1;
                fetchEvents(currentSearchQuery, currentStatuses);
            };
        });
    }

    
    if (dateFilterButton) {
        dateFilterButton.addEventListener('click', function() {
            const filterModal = document.createElement('div');
            filterModal.className = 'modal';
            filterModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>选择开始时间范围</h3>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="date-filter-form">
                            <div class="date-input-group">
                                <label>开始日期:</label>
                                <input type="date" id="startDate" value="${currentStartDate}">
                            </div>
                            <div class="date-input-group">
                                <label>结束日期:</label>
                                <input type="date" id="endDate" value="${currentEndDate}">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="clearDateFilter">清除筛选</button>
                        <button class="btn btn-primary" id="applyDateFilter">应用</button>
                        <button class="btn btn-secondary" id="cancelDateFilter">取消</button>
                    </div>
                </div>
            `;

            document.body.appendChild(filterModal);

            // Add event listeners for the modal
            const closeBtn = filterModal.querySelector('.close');
            const cancelBtn = filterModal.querySelector('#cancelDateFilter');
            const applyBtn = filterModal.querySelector('#applyDateFilter');
            const clearBtn = filterModal.querySelector('#clearDateFilter');

            closeBtn.onclick = () => document.body.removeChild(filterModal);
            cancelBtn.onclick = () => document.body.removeChild(filterModal);

            clearBtn.onclick = () => {
                currentStartDate = "";
                currentEndDate = "";
                document.body.removeChild(filterModal);
                currentPage = 1;
                fetchEvents(currentSearchQuery, currentStatuses);
            };

            applyBtn.onclick = () => {
                const startDate = filterModal.querySelector('#startDate').value;
                const endDate = filterModal.querySelector('#endDate').value;

                if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                    alert('开始日期不能大于结束日期');
                    return;
                }

                currentStartDate = startDate;
                currentEndDate = endDate;
                
                document.body.removeChild(filterModal);
                currentPage = 1;
                fetchEvents(currentSearchQuery, currentStatuses);
            };
        });
    }

     

   

    if (statusFilterButton) {
        statusFilterButton.addEventListener('click', function() {
            const filterModal = document.createElement('div');
            filterModal.className = 'modal';
            filterModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>选择活动状态</h3>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="status-selection">
                            <label class="status-option">
                                <input type="checkbox" value="not started" ${currentStatuses.includes('not started') ? 'checked' : ''}> 未开始
                            </label>
                            <label class="status-option">
                                <input type="checkbox" value="ongoing" ${currentStatuses.includes('ongoing') ? 'checked' : ''}> 进行中
                            </label>
                            <label class="status-option">
                                <input type="checkbox" value="completed" ${currentStatuses.includes('completed') ? 'checked' : ''}> 已结束
                            </label>
                            <label class="status-option">
                                <input type="checkbox" value="cancelled" ${currentStatuses.includes('cancelled') ? 'checked' : ''}> 已取消
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="applyStatusFilter">应用</button>
                        <button class="btn btn-secondary" id="cancelStatusFilter">取消</button>
                    </div>
                </div>
            `;

            document.body.appendChild(filterModal);

            // Add event listeners for the modal
            const closeBtn = filterModal.querySelector('.close');
            const cancelBtn = filterModal.querySelector('#cancelStatusFilter');
            const applyBtn = filterModal.querySelector('#applyStatusFilter');

            closeBtn.onclick = () => document.body.removeChild(filterModal);
            cancelBtn.onclick = () => document.body.removeChild(filterModal);

            applyBtn.onclick = () => {
                const selectedStatuses = Array.from(filterModal.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(cb => cb.value);
                
                // Update the currentStatuses array with the selected values
                currentStatuses = selectedStatuses;
                
                document.body.removeChild(filterModal);
                currentPage = 1;
                // Pass all current filter parameters
                fetchEvents(currentSearchQuery, currentStatuses);
            };
        });
    }
   
    // Add export button event listener
     // Add export button event listener if the button exists
     if (exportButton) {
        exportButton.addEventListener('click', async function() {
            // Create and show format selection modal
            const formatModal = document.createElement('div');
            formatModal.className = 'modal';
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
                            <label><input type="checkbox" value="活动ID" checked> 活动ID</label>
                            <label><input type="checkbox" value="标题" checked> 标题</label>
                            <label><input type="checkbox" value="状态" checked> 状态</label>
                            <label><input type="checkbox" value="开始时间" checked> 开始时间</label>
                            <label><input type="checkbox" value="结束时间" checked> 结束时间</label>
                            <label><input type="checkbox" value="创建时间" checked> 创建时间</label>
                            <label><input type="checkbox" value="地点" checked> 地点</label>
                            <label><input type="checkbox" value="描述" checked> 描述</label>
                            <label><input type="checkbox" value="参与者数量" checked> 参与者数量</label>
                            <label><input type="checkbox" value="报名截止" checked> 报名截止</label>
                            <label><input type="checkbox" value="价格" checked> 价格</label>
                            <label><input type="checkbox" value="在线链接" checked> 在线链接</label>
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

          confirmBtn.onclick = () => {
              const format = formatModal.querySelector('input[name="exportFormat"]:checked').value;
              const selectedColumns = Array.from(checkboxes)
                  .filter(cb => cb.checked)
                  .map(cb => cb.value);

              if (selectedColumns.length === 0) {
                  alert('请至少选择一个导出列');
                  return;
              }

              document.body.removeChild(formatModal);
              exportData(format, selectedColumns);
          };
      });
    }

    // Export function that handles both XLSX and CSV formats
    async function exportData(format,selectedColumns) {
        try {
            if (loader) loader.style.display = "flex";
            
            const params = new URLSearchParams();
            params.append("table", "event");
            params.append("export", "true");
            
            if (currentSearchQuery.trim() !== "") {
                params.append("search", currentSearchQuery);
            }
            if (currentSortColumn) {
                params.append("sort", currentSortColumn);
                params.append("order", currentSortOrder);
            }
            
            const url = `${API_BASE_URL}?${params.toString()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            const exportData = (data.data || []).map((event, index) => {
                const rowData = {};
                if (selectedColumns.includes('序号')) rowData['序号'] = index + 1;
                if (selectedColumns.includes('活动ID')) rowData['活动ID'] = event.ID;
                if (selectedColumns.includes('标题')) rowData['标题'] = event.title || '';
                if (selectedColumns.includes('状态')) rowData['状态'] = event.status || '';
                if (selectedColumns.includes('开始时间')) rowData['开始时间'] = formatDateTime(event.start_time) || '';
                if (selectedColumns.includes('结束时间')) rowData['结束时间'] = formatDateTime(event.end_time) || '';
                if (selectedColumns.includes('创建时间')) rowData['创建时间'] = formatDateTime(event.created_at) || '';
                if (selectedColumns.includes('地点')) rowData['地点'] = event.location || '';
                if (selectedColumns.includes('描述')) rowData['描述'] = event.description || '';
                if (selectedColumns.includes('参与者数量')) rowData['参与者数量'] = event.max_participant || '';
                if (selectedColumns.includes('报名截止')) rowData['报名截止'] = formatDateTime(event.registration_deadline) || '';
                if (selectedColumns.includes('价格')) rowData['价格'] = formatPrice(event.price) || '';
                if (selectedColumns.includes('在线链接')) rowData['在线链接'] = event.online_link || '';
                return rowData;
            });


            const currentDate = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
            
            if (format === 'xlsx') {
                // Export as XLSX
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(exportData);
                
                // Set column widths
                const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 15 }));
                ws['!cols'] = colWidths;

                // Style the worksheet
                for (let cell in ws) {
                    if (cell[0] === '!') continue;
                    if (!ws[cell].v) ws[cell].v = '';
                }

                XLSX.utils.book_append_sheet(wb, ws, "活动数据");
                XLSX.writeFile(wb, `活动数据_${currentDate}.xlsx`);
            } else {
                // Export as CSV
                const headers = Object.keys(exportData[0] || {});
                let csvContent = headers.join(',') + '\n';
                
                exportData.forEach(row => {
                    const rowData = headers.map(header => {
                        const value = row[header] || '';
                        // Escape quotes and wrap in quotes if contains comma or newline
                        return `"${String(value).replace(/"/g, '""')}"`;
                    });
                    csvContent += rowData.join(',') + '\n';
                });

                // Create blob and download
                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `活动数据_${currentDate}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            alert('导出成功！');
        } catch (error) {
            console.error('Export failed:', error);
            alert('导出失败，请稍后重试\n错误信息: ' + error.message);
        } finally {
            if (loader) loader.style.display = "none";
        }
        
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Implement the debounced search
    const debouncedSearch = debounce((searchText) => {
        console.log("Searching for events:", searchText);
        currentPage = 1; // Reset to first page when searching
        fetchEvents(searchText);
    }, 300); // 300ms delay
    
    // Add this event listener after your other listeners
    if (searchInput) {
        searchInput.addEventListener("input", function() {
            debouncedSearch(this.value);
        });
    }

    async function fetchEvents(query = "", statuses = []) {
        loader.style.display = "flex";
        eventTableBody.innerHTML = "";
        
        // Store the current search query
        currentSearchQuery = query;
        
        const params = new URLSearchParams();
        params.append("table", "event");
        params.append("limit", itemsPerPage);
        params.append("page", currentPage);
        params.append("search", "true"); 

        if (query.trim() !== "") {
            params.append("search", query);
        }
        
        if (statuses && statuses.length > 0) {
            params.append("status", statuses[0]); // API expects single status value
            console.log("Filtering by status:", statuses[0]);
        }

        let useMultipleRequests = false;
        let startTimeEvents = null;
        let endTimeEvents = null;
        
        // Check if both filters are active
        if (currentStartDate && currentEndTimeStartDate) {
            useMultipleRequests = true;
        } else {
            // Use single request with appropriate parameters
            if (currentStartDate) {
                params.append("startDate", currentStartDate);
                params.append("endDate", currentEndDate);
                params.append("startDateRange", "true");
            }
            
            if (currentEndTimeStartDate) {
                params.append("startDate", currentEndTimeStartDate);
                params.append("endDate", currentEndTimeEndDate);
                params.append("endDateRange", "true");
            }
        }
    
        
        if (currentStartPrice) {
            params.append("startPrice", currentStartPrice);
            params.append("endPrice", currentEndPrice);
            params.append("priceRange", "true");
        }

        if (currentSortColumn) {
            params.append("sort", currentSortColumn);
            params.append("order", currentSortOrder);
        }
        
        const url = `${API_BASE_URL}?${params.toString()}`;
        console.log("API URL:", url);
        
        try {
            console.log("Fetching events...");
            
            let data;
            
            if (useMultipleRequests) {
                // Make two separate requests and combine results
                
                // First request - start time filter
                const startTimeParams = new URLSearchParams(params.toString());
                startTimeParams.append("startDate", currentStartDate);
                startTimeParams.append("endDate", currentEndDate);
                startTimeParams.append("startDateRange", "true");
                
                // Second request - end time filter
                const endTimeParams = new URLSearchParams(params.toString());
                endTimeParams.append("startDate", currentEndTimeStartDate);
                endTimeParams.append("endDate", currentEndTimeEndDate);
                endTimeParams.append("endDateRange", "true");
                
                // Execute both requests
                const [startTimeResponse, endTimeResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}?${startTimeParams.toString()}`),
                    fetch(`${API_BASE_URL}?${endTimeParams.toString()}`)
                ]);
                
                if (!startTimeResponse.ok || !endTimeResponse.ok) {
                    throw new Error('One or more API requests failed');
                }
                
                const startTimeData = await startTimeResponse.json();
                const endTimeData = await endTimeResponse.json();
                
                // Process and filter the data to find common events that match both criteria
                const startTimeIds = new Set(startTimeData.data.map(event => event.ID));
                const filteredEndTimeEvents = endTimeData.data.filter(event => startTimeIds.has(event.ID));
                
                // Use the filtered data
                data = {
                    data: filteredEndTimeEvents,
                    total: filteredEndTimeEvents.length
                };
                
            } else {
                // Single request approach
                const url = `${API_BASE_URL}?${params.toString()}`;
                console.log("API URL:", url);
                
                const response = await fetch(url);
                console.log("Raw response status:", response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Server error response: ${errorText}`);
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                
                data = await response.json();
            }
            
          
            eventData = data.data;
            totalEvents.textContent = data.total || 0;
            totalPages = Math.ceil((data.total || eventData.length) / itemsPerPage);
            displayEvents(eventData);
            updatePagination();
            updatePageInputMax();
        } catch (error) {
            console.error("Error fetching events:", error);
            eventTableBody.innerHTML = `<tr><td colspan="13" class="error-message">Failed to load events. Please try again later. Error: ${error.message}</td></tr>`;
            totalEvents.textContent = "0";
            totalPages = 0;
            updatePagination();
        } finally {
            loader.style.display = "none";
        }
    }

    function displayEvents(events) {
        eventTableBody.innerHTML = "";
        if (events.length === 0) {
            eventTableBody.innerHTML = `<tr><td colspan="13" class="no-data">No events found</td></tr>`;
            return;
        }
        
        const startIndex = (currentPage - 1) * itemsPerPage + 1;

        events.forEach((event,index) => {
            const displayIndex = startIndex + index;

            let onlineLinkDisplay = '';
            if (event.online_link) {
                // Ensure the link has http:// or https:// prefix
                const linkUrl = event.online_link.startsWith('http') ? event.online_link : `https://${event.online_link}`;
                // Create a clickable link with truncated visible text
                onlineLinkDisplay = `<a href="${linkUrl}" target="_blank" class="event-link">${truncateText(event.online_link, 30)}</a>`;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${displayIndex}</td> <!-- Display sequential number -->
                <td class="hidden-id">${highlightText(event.ID || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.title || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.status || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.start_time) || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.end_time) || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.created_at) || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.location || '-', currentSearchQuery)}</td>
                <td>${highlightText(truncateText(event.description, 50) || '-', currentSearchQuery)}</td>
                <td>${highlightText(event.max_participant || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatDateTime(event.registration_deadline) || '-', currentSearchQuery)}</td>
                <td>${highlightText(formatPrice(event.price) || '0', currentSearchQuery)}</td>
                <td>${onlineLinkDisplay}</td>
                <td>
                <button class="btn btn-edit" data-id="${event.ID}">编辑</button>
                <button class="btn btn-delete" data-id="${event.ID}">删除</button>
                <button class="btn btn-view" data-id="${event.ID}">查看</button>
                </td>
            `;
            eventTableBody.appendChild(row);
        });
    }

    function highlightText(text, searchQuery) {
        if (!searchQuery || searchQuery.trim() === '' || !text) return text;
        
        // Convert both text and search to lowercase for case-insensitive matching
        const textStr = String(text).toLowerCase();
        const searchStr = searchQuery.toLowerCase();
        
        if (textStr.includes(searchStr)) {
            // Create a regular expression with the search query to match case-insensitively
            const regex = new RegExp(`(${escapeRegExp(searchStr)})`, 'gi');
            return String(text).replace(regex, '<span class="highlight">$1</span>');
        }
        
        return text;
    }
    
    // Helper function to escape special characters in search query for safe regex use
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr || dateTimeStr === '0000-00-00 00:00:00') return '-';
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

    function formatPrice(price) {
        if (price === null || price === undefined) return '';
        return `RM${parseFloat(price).toFixed(2)}`;
    }

    function updatePagination() {
        paginationContainer.innerHTML = '';
        totalPages = Math.ceil((totalEvents.textContent || eventData.length) / itemsPerPage);
        currentPage = Math.min(currentPage, totalPages) || 1;  // Ensure valid page number
    
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage >= totalPages;
        // Only show pagination if we have more than one page
        if (totalPages <= 1) {
            prevPageButton.disabled = true;
            nextPageButton.disabled = true;
            return;
        }
        
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
        
        // Determine page range to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Show first page button if not starting from page 1
        if (startPage > 1) {
            addPageButton(1);
            if (startPage > 2) {
                addEllipsis();
            }
        }
        
        // Add page buttons
        for (let i = startPage; i <= endPage; i++) {
            addPageButton(i);
        }
        
        // Show last page button if not ending at last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                addEllipsis();
            }
            addPageButton(totalPages);
        }
    }
    
    function addPageButton(pageNum) {
        const button = document.createElement('button');
        button.className = 'page-number';
        if (pageNum === currentPage) {
            button.classList.add('active');
        }
        button.textContent = pageNum;
        button.addEventListener('click', () => {
            changePage(pageNum);
        });
        paginationContainer.appendChild(button);
    }
    
    function addEllipsis() {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'ellipsis';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
    }

    function handleSortClick(columnName) {
        if (currentSortColumn === columnName) {
            currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSortColumn = columnName;
            currentSortOrder = 'ASC';
        }
        currentPage = 1;
        updateSortIcons();
        fetchEvents(currentSearchQuery);
    }

    function updateSortIcons() {
        document.querySelectorAll('th[data-column]').forEach(th => {
            const icon = th.querySelector('i');
            if (!icon) return;
            icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
            if (th.dataset.column === currentSortColumn) {
                icon.classList.add(currentSortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
            } else {
                icon.classList.add('fa-sort');
            }
        });
    }
    
    // New pagination functions
    window.changePage = function(page) {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchEvents(currentSearchQuery);
        }
    };
    
    // 添加本地存储相关的常量
    const STORAGE_KEY = 'eventListSettings';
    
    // 在 DOMContentLoaded 事件处理函数开始处添加
    const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    itemsPerPage = parseInt(savedSettings.itemsPerPage) || parseInt(itemsPerPageSelect.value);
    itemsPerPageSelect.value = itemsPerPage;
    
    // 修改 jumpToPage 函数
    window.jumpToPage = function() {
        const pageInputElement = document.getElementById('pageInput');
        if (!pageInputElement) return;
        
        let targetPage = parseInt(pageInputElement.value);
        
        // 增强的输入验证
        if (!pageInputElement.value.trim()) {
            alert('请输入页码');
            return;
        }
        
        if (isNaN(targetPage) || !Number.isInteger(targetPage)) {
            alert('请输入有效的整数页码');
            pageInputElement.value = '';
            return;
        }
        
        if (targetPage < 1) {
            alert('页码不能小于1');
            targetPage = 1;
        } else if (targetPage > totalPages) {
            alert(`页码不能大于最大页数 ${totalPages}`);
            targetPage = totalPages;
        }
        
        if (targetPage !== currentPage) {
            // 更新 URL 参数
            const url = new URL(window.location.href);
            url.searchParams.set('page', targetPage);
            window.history.pushState({}, '', url);
            
            changePage(targetPage);
        }
        
        pageInputElement.value = '';
    };
    
    // 修改 itemsPerPageSelect 的事件监听器
    itemsPerPageSelect.addEventListener("change", function () {
        const newItemsPerPage = parseInt(this.value);
        if (newItemsPerPage !== itemsPerPage) {
            itemsPerPage = newItemsPerPage;
            currentPage = 1;
            
            // 保存设置到本地存储
            const settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            settings.itemsPerPage = itemsPerPage;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            
            // 更新 URL 参数
            const url = new URL(window.location.href);
            url.searchParams.set('perPage', itemsPerPage);
            url.searchParams.delete('page'); // 重置页码
            window.history.pushState({}, '', url);
            
            fetchEvents(currentSearchQuery, currentStatuses);
        }
    });
    
    // 添加页面加载时的 URL 参数处理
    window.addEventListener('load', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = parseInt(urlParams.get('page'));
        const perPageParam = parseInt(urlParams.get('perPage'));
        
        if (!isNaN(perPageParam) && perPageParam > 0) {
            itemsPerPage = perPageParam;
            itemsPerPageSelect.value = perPageParam;
        }
        
        if (!isNaN(pageParam) && pageParam > 0) {
            currentPage = pageParam;
        }
        
        fetchEvents(currentSearchQuery,currentStatuses );
    });

    function updatePageInputMax() {
        if (pageInput) {
            pageInput.max = totalPages;
        }
    }

    document.querySelectorAll('th[data-column]').forEach(th => {
        th.addEventListener('click', function() {
            handleSortClick(this.dataset.column);
        });
    });

    prevPageButton.addEventListener("click", function () {
        if (currentPage > 1) {
            changePage(currentPage - 1);
        }
    });

    nextPageButton.addEventListener("click", function () {
        if (currentPage < totalPages) {
            changePage(currentPage + 1);
        }
    });

    // Handle search button click
    if (searchButton && searchInput) {
        searchButton.addEventListener("click", function() {
            currentPage = 1;
            fetchEvents(searchInput.value, currentStatuses);
        });

        
        // Also search when Enter key is pressed
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchButton.click();
            }
        });
    }
    
    // Update itemsPerPage handler to refresh data immediately
    itemsPerPageSelect.addEventListener("change", function () {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Reset to first page when changing items per page
        fetchEvents(currentSearchQuery, currentStatuses);
    });

    // Jump button event handler
    if (jumpButton) {
        jumpButton.addEventListener('click', function() {
            jumpToPage();
        });
    }

    // Also handle Enter key press in page input
    if (pageInput) {
        pageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                jumpToPage();
            }
        });
    }

    window.editEvent = function (id) {
        window.location.href = `edit_event.html?id=${id}`;
    };

    window.deleteEvent = async function (id) {
        if (confirm("确定要删除这个活动吗？")) {
            try {
                const response = await fetch(`${API_BASE_URL}?table=event&action=delete&ID=${id}`, {
                    method: "DELETE"
                });
    
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Error response: ${errorText}`);
                    throw new Error(`Server responded with status: ${response.status}`);
                }
        
                const data = await response.json();
                console.log("Delete response:", data);

                if (data.success || (data.message && data.message.includes("deleted successfully"))) {
                    alert("活动已成功删除！");
                    fetchEvents(currentSearchQuery);
                } else {
                    alert("删除活动失败: " + (data.message || "未知错误"));
                }
            } catch (error) {
                console.error("Error deleting event:", error);
                alert("删除活动时发生错误，请稍后再试。");
            }
        }
    };


    
    // Existing viewEventDetails function (already present in the code)
window.viewEventDetails = function (id) {
    window.location.href = `eventDetails.html?id=${id}`;
};

// Update the event listener to include view button handling
eventTableBody.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-edit')) {
        const id = e.target.dataset.id;
        editEvent(id);
    } else if (e.target.classList.contains('btn-delete')) {
        const id = e.target.dataset.id;
        deleteEvent(id);
    } else if (e.target.classList.contains('btn-view')) {
        const id = e.target.dataset.id;
        viewEventDetails(id);
    }
});
    
    

    
loadSavedColumnWidths();   
initializeColumnResizers();
    // Initial fetch
    fetchEvents();
});