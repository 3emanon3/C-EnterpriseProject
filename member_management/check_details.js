document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = 'http://localhost/projects/C-EnterpriseProject/recervingAPI.php';
    
    // DOM Elements
    const loader = document.querySelector(".loader");
    const backButton = document.getElementById("backButton");
    const memberDetailsContainer = document.getElementById("memberDetails");
    const participationTable = document.getElementById("participationTable").querySelector("tbody");
    const donationTable = document.getElementById("donationTable").querySelector("tbody");
    const stockTable = document.getElementById("stockTable").querySelector("tbody");
    
    // Get member ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    let MemberId;
    
    if (!memberId) {
        showError("错误：未提供塾员ID");
        return;
    }
    
    // Set up print function
    function setupPrintFunction() {
        // Create print button and add it to the actions div
        const actionsDiv = document.querySelector('.actions');
        const printButton = document.createElement('button');
        printButton.id = 'printButton';
        printButton.className = 'btn btn-print';
        printButton.innerHTML = '<i class="fas fa-print"></i> 打印塾员资料';
        actionsDiv.appendChild(printButton);
        
        // Add event listener for print button
        printButton.addEventListener('click', function() {
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            
            // Get member details from the current page
            const memberId = document.getElementById('membersID').textContent;
            const name = document.getElementById('Name').textContent;
            const cname = document.getElementById('CName').textContent;
            const designation = document.getElementById('designation').textContent;
            const address = document.getElementById('Address').textContent;
            const position = document.getElementById('position').textContent;
            const phone = document.getElementById('phone_number').textContent;
            const email = document.getElementById('email').textContent;
            const ic = document.getElementById('IC').textContent;
            const oldIc = document.getElementById('oldIC').textContent;
            const gender = document.getElementById('gender').textContent;
            const pob = document.getElementById('placeOfBirth').textContent;
            const birthday = document.getElementById('Birthday').textContent;
            const company = document.getElementById('companyName').textContent;
            const expDate = document.getElementById('expiredDate').textContent.replace('<span class="expired-tag">已过期</span>', '(已过期)');
            const remarks = document.getElementById('remarks').textContent;
            const other = document.getElementById('other').textContent;
            
            // Get participation history table
            const participationRows = Array.from(document.querySelectorAll('#participationTable tbody tr')).map(row => {
                if(row.querySelector('.no-results') || row.querySelector('.error-message') || row.querySelector('.loading-message')) {
                    return '<tr><td colspan="5" style="text-align:center;">没有参与记录</td></tr>';
                }
                return row.outerHTML;
            }).join('');
            
            // Get donation history table
            const donationRows = Array.from(document.querySelectorAll('#donationTable tbody tr')).map(row => {
                if(row.querySelector('.no-results') || row.querySelector('.error-message') || row.querySelector('.loading-message')) {
                    return '<tr><td colspan="7" style="text-align:center;">没有捐款记录</td></tr>';
                }
                return row.outerHTML;
            }).join('');
            
            // Get purchase history table
            const purchaseRows = Array.from(document.querySelectorAll('#stockTable tbody tr')).map(row => {
                if(row.querySelector('.no-results') || row.querySelector('.error-message') || row.querySelector('.loading-message')) {
                    return '<tr><td colspan="9" style="text-align:center;">没有购买记录</td></tr>';
                }
                return row.outerHTML;
            }).join('');
            
            // Current date and time for the print header
            const now = new Date();
            const dateTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const logoPath = '/projects/C-EnterpriseProject/assets/logo.png';
            const fullLogoUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}${logoPath}`;
            
            // Create print HTML
            const printContent = `
                <!DOCTYPE html>
                <html lang="zh">
                <head>
                    <meta charset="UTF-8">
                    <title>塾员详细信息 - ${cname || name}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            color: #333;
                        }
                        .print-header {
                            height: 150px;
                            text-align: center;
                            margin-bottom: 20px;
                            padding-bottom: 10px;
                            border-bottom: 1px solid #ddd;
                            position: relative;
                        }
                        .print-timestamp {
                            font-size: 12px;
                            color: #777;
                            text-align: right;
                            margin-bottom: 10px;
                        }
                        .logo-container {
                            text-align: center;
                            font-weight: bold;
                            position: relative;
                            height: 100px;
                            width: 100%;
                            background-position: center top;
                        }
                        h1 {
                            height: auto;
                            color: #333;
                            font-size: 24px;
                        }
                        h2 {
                            border-bottom: 1px solid #ddd;
                            padding-bottom: 5px;
                            margin-top: 20px;
                            color: #333;
                            font-size: 18px;
                        }
                        .detail-section {
                            margin-bottom: 20px;
                        }
                        .detail-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 10px;
                        }
                        .detail-item {
                            margin-bottom: 8px;
                        }
                        .full-width {
                            grid-column: span 2;
                        }
                        label {
                            font-weight: bold;
                            display: inline-block;
                            margin-right: 5px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #f2f2f2;
                        }
                        .total-row {
                            font-weight: bold;
                        }
                        .status-tag {
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 12px;
                        }
                        .attending {
                            background-color: #dff0d8;
                            color: #3c763d;
                        }
                        .not-attending {
                            background-color: #f2dede;
                            color: #a94442;
                        }
                        .maybe {
                            background-color: #fcf8e3;
                            color: #8a6d3b;
                        }
                        .expired {
                            color: #a94442;
                        }
                        .page-break {
                            page-break-before: always;
                        }

                        .logo-container img {
                            position: absolute;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 200px;
                            height: 100px;
                            object-fit: contain;
                        }

                        @media print {
                            body {
                                padding: 0;
                                margin: 0;
                            }
                            .no-print {
                                display: none;
                            }

                            
                        }
                    </style>
                </head>
                <body>
                    <div class="print-timestamp">打印时间: ${dateTimeStr}</div>
                    <div class="print-header">
                    <div class="logo-container">
                        <img src="${fullLogoUrl}" alt="SEIWAJYUKU MALAYSIA">
                    </div>
                        <h1>塾员详细信息</h1>
                    </div>
                    
                    <div class="detail-section">
                        <h2>基本信息</h2>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>塾员ID:</label>
                                <span>${memberId}</span>
                            </div>
                            <div class="detail-item">
                                <label>英文名:</label>
                                <span>${name}</span>
                            </div>
                            <div class="detail-item">
                                <label>中文名:</label>
                                <span>${cname}</span>
                            </div>
                            <div class="detail-item">
                                <label>塾员类型:</label>
                                <span>${designation}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>地址:</label>
                                <span>${address}</span>
                            </div>
                            <div class="detail-item">
                                <label>职位:</label>
                                <span>${position}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2>联系方式</h2>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>电话:</label>
                                <span>${phone}</span>
                            </div>
                            <div class="detail-item">
                                <label>邮箱:</label>
                                <span>${email}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2>个人资料</h2>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>身份证号:</label>
                                <span>${ic}</span>
                            </div>
                            <div class="detail-item">
                                <label>旧身份证号:</label>
                                <span>${oldIc}</span>
                            </div>
                            <div class="detail-item">
                                <label>性别:</label>
                                <span>${gender}</span>
                            </div>
                            <div class="detail-item">
                                <label>出生地:</label>
                                <span>${pob}</span>
                            </div>
                            <div class="detail-item">
                                <label>生日:</label>
                                <span>${birthday}</span>
                            </div>
                            <div class="detail-item">
                                <label>公司名称:</label>
                                <span>${company}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2>塾员状态</h2>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>到期日期:</label>
                                <span class="${expDate.includes('已过期') ? 'expired' : ''}">${expDate}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>备注:</label>
                                <span>${remarks}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>其他信息:</label>
                                <span>${other}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section page-break">
                        <h2>参与活动历史</h2>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>活动名称</th>
                                        <th>参与日期</th>
                                       
                                    </tr>
                                </thead>
                                <tbody>
                                    ${participationRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2>捐款历史</h2>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>捐款ID</th>
                                        <th>捐款日期</th>
                                        <th>金额</th>
                                        <th>捐款类型</th>
                                        <th>银行类型</th>
                                        <th>收据号码</th>
                                        <th>备注</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${donationRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h2>购买记录</h2>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>订单ID</th>
                                        <th>商品名称</th>
                                        <th>购买日期</th> 
                                        <th>进入数量</th>
                                        <th>剩余数量</th>
                                        <th>金额</th>
                                        <th>总额</th>
                                        <th>备注</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${purchaseRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="no-print">
                        <button onclick="window.print()" style="margin-top: 20px; padding: 8px 16px; background-color: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 4px;">
                            打印此页
                        </button>
                        <button onclick="window.close()" style="margin-top: 20px; margin-left: 10px; padding: 8px 16px; background-color: #f44336; color: white; border: none; cursor: pointer; border-radius: 4px;">
                            关闭
                        </button>
                    </div>
                    
                    <script>
                        // Auto print if needed
                        // window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `;
            
            // Write to the new window
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();
        });
    }

    if (!memberId) {
        showError("错误：未提供塾员ID");
        return;
    }
    
    // Set up event listeners
    backButton.addEventListener("click", function() {
        window.location.href = "member_search.html";
    });

    
    
    // Show error message
    function showError(message) {
        loader.style.display = "none";
        memberDetailsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="window.location.href='member_search.html'" class="btn">返回塾员列表</button>
            </div>
        `;
    }
    
    // Format functions
    function formatPhone(phone) {
        return phone ? String(phone).replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : '无';
    }
    
    function formatIC(ic) {
        if (!ic) return '无';
        return String(ic).replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
    }
    
    function formatDate(dateString) {
        if (!dateString) return '无';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '无效日期';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    function getDesignationDisplay(designation) {
        if (!designation) return '无';
        
        switch(designation) {
            case '1': 
            case 1: return '会员';
            case '2': 
            case 2: return '非会员';
            case '3': 
            case 3: return '外国人';
            case '4': 
            case 4: return '拒绝续费';
            case '5': 
            case 5: return '逾期';
            case '6': 
            case 6: return '黑名单';
            default: return designation;
        }
    }
    
    // Format currency
    function formatCurrency(amount) {
        if (!amount) return 'RM 0.00';
        return `RM ${parseFloat(amount).toFixed(2)}`;
    }
    
    // Fetch member details
    async function fetchMemberDetails() {
        loader.style.display = "block";
        
        try {
            const response = await fetch(`${API_BASE_URL}?table=members_with_applicant_designation&search=true&ID=${memberId}`);
            
            if (!response.ok) {
                throw new Error(`服务器返回错误: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !data.data || data.data.length === 0) {
                throw new Error("未找到塾员数据");
            }
            
            const member = data.data[0];

            MemberId = member.membersID || member.ID || Id;

            displayMemberDetails(member);
            
            // After displaying member details, fetch related data
            await fetchRelatedData();
            
        } catch (error) {
            console.error("Error fetching member details:", error);
            showError(`获取塾员数据失败: ${error.message}`);
        } finally {
            loader.style.display = "none";
        }
    }

    async function fetchRelatedData() {
        try {
            await Promise.all([
                fetchParticipationHistory(),
                fetchDonationHistory(),
                fetchStockHistory()
            ]);
        } catch (error) {
            console.error("Error fetching related data:", error);
        }
    }
    
    // Display member details
    function displayMemberDetails(member) {
        // Helper function to update element text safely
        function updateElement(id, value, formatter = null) {
            const element = document.getElementById(id);
            if (element) {
                const displayValue = value || '无';
                element.textContent = formatter ? formatter(displayValue) : displayValue;
            }
        }
        
        // Map field names that might have variations
        const expiredDate = member['expired date'] || 
                          member['expired_date'] || 
                          member['expiredDate'] || 
                          member['expireddate'];
                              
        const placeOfBirth = member['place of birth'] || 
                          member['place_of_birth'] || 
                          member['placeOfBirth'] || 
                          member['placeofbirth'];
        
        const designation = member['designation of applicant'] || 
                          member['designation_of_applicant'];
        
        const gender = member['gender'] ||
                     member['Gender'] ||
                     member['sex'] ||
                     member['Sex'];
        
        const companyName = member['componyName'] || member['companyName'];
        
        // Update all fields
        updateElement('membersID', member.membersID);
        updateElement('Name', member.Name);
        updateElement('CName', member.CName);
        updateElement('designation', designation, getDesignationDisplay);
        updateElement('Address', member.Address);
        updateElement('phone_number', member.phone_number, formatPhone);
        updateElement('email', member.email);
        updateElement('IC', member.IC, formatIC);
        updateElement('oldIC', member.oldIC, formatIC);
        updateElement('gender', gender);
        updateElement('placeOfBirth', placeOfBirth);
        updateElement('Birthday', member.Birthday);
        updateElement('companyName', companyName);
        updateElement('expiredDate', expiredDate, formatDate);
        updateElement('position', member.position);
        updateElement('remarks', member.remarks);
        updateElement('other', member.other);
        
        // Add styling for expired membership
        if (expiredDate) {
            const expiryDate = new Date(expiredDate);
            const today = new Date();
            
            if (expiryDate < today) {
                const expiryElement = document.getElementById('expiredDate');
                if (expiryElement) {
                    expiryElement.classList.add('expired');
                    expiryElement.innerHTML = `${formatDate(expiredDate)} <span class="expired-tag">已过期</span>`;
                }
            }
        }
    }
    
    // Fetch participation history
    async function fetchParticipationHistory() {
        participationTable.innerHTML = `<tr><td colspan="5" class="loading-message">正在加载参与历史...</td></tr>`;

        const idFieldOptions = ['membersID', 'memberID', 'membership'];
        
        let success = false;
        
        for (const idField of idFieldOptions) {
            if (success) break;

        try {
            const response = await fetch(`${API_BASE_URL}?table=vparticipants&search=true&${idField}=${MemberId}`);
            
            if (!response.ok) {
                throw new Error(`服务器返回错误: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.data && data.data.length > 0) {
                displayParticipationHistory(data.data);
                success = true;
            }
            
        } catch (error) {
            console.error("Error fetching participation history:", error);
            participationTable.innerHTML = `<tr><td colspan="2" class="error-message">获取参与历史失败: ${error.message}</td></tr>`;
        }
    }
    if (!success) {
        participationTable.innerHTML = `<tr><td colspan="2" class="no-results">没有参与记录</td></tr>`;
    }
}
    
    // Display participation history
    function displayParticipationHistory(participations) {
        const memberParticipations = participations.filter(p => p.membersID === MemberId);

         if (!memberParticipations || memberParticipations.length === 0) {
        participationTable.innerHTML = `<tr><td colspan="2" class="no-results">没有参与记录</td></tr>`;
        return;
    }
        
        participationTable.innerHTML = '';
        
        memberParticipations.forEach(participation => {
            const row = document.createElement('tr');
            
            
            row.innerHTML = `
            <td>${participation.eventID || participation.eventID || '无'}</td>
            <td>${formatDate(participation.joined_at || participation.joined_at)}</td>
             
            `;
            
            participationTable.appendChild(row);
        });
        if (participationTable.children.length === 0) {
            participationTable.innerHTML = `<tr><td colspan="2" class="no-results">没有参与记录</td></tr>`;
        }
    }
    
    // Fetch donation history
    async function fetchDonationHistory() {
        const idFieldOptions = [ 'membership'];
        
        let success = false;
        
        for (const idField of idFieldOptions) {
            if (success) break;
            
            try {
                const response = await fetch(`${API_BASE_URL}?table=donation_details&search=true&${idField}=${MemberId}`);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data && data.data && data.data.length > 0) {
                    displayDonationHistory(data.data);
                    success = true;
                }
                
            } catch (error) {
                console.error(`Error fetching donation data with ${idField}:`, error);
            }
        }
        
        if (!success) {
            donationTable.innerHTML = `<tr><td colspan="7" class="no-results">没有捐款记录</td></tr>`;
        }
    }
    
    // Display donation history
    function displayDonationHistory(donations) {
        if (!donations || donations.length === 0) {
            donationTable.innerHTML = `<tr><td colspan="7" class="no-results">没有捐款记录</td></tr>`;
            return;
        }
        
        donationTable.innerHTML = '';
        
        // Calculate total
        let totalAmount = 0;
        
        donations.forEach(donation => {
            const amount = parseFloat(donation.amount) || 0;
            totalAmount += amount;
            
            const row = document.createElement('tr');
            row.innerHTML = `
               <td>${donation.ID || donation.donation_id || '无'}</td>
            <td>${formatDate(donation.paymentDate || donation.donation_date)}</td>
            <td>${formatCurrency(donation.amount)}</td>
            <td>${donation.donationTypes || donation.donation_type || '无'}</td>
            <td>${donation.Bank || donation.bank_type || '无'}</td>
            <td>${donation.official_receipt_no || donation.receipt_no || '无'}</td>
            <td>${donation.Remarks || donation.remarks || '无'}</td>
            `;
            
            donationTable.appendChild(row);
        });
        
        // Add total row
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = `
            <td colspan="2" class="total-label">总计</td>
            <td class="total-amount">${formatCurrency(totalAmount)}</td>
            <td colspan="4"></td>
        `;
        
        donationTable.appendChild(totalRow);
    }
    
    // Fetch purchase history
    async function fetchStockHistory() {
        stockTable.innerHTML = `<tr><td colspan="9" class="loading-message">正在加载购买记录...</td></tr>`;
        
        try {
            const response = await fetch(`${API_BASE_URL}?table=vsoldrecord&search=true&direct=true&memberID=${memberId}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.data && data.data.length > 0) {
                    displayPurchaseHistory(data.data);
                } else {
                    stockTable.innerHTML = `<tr><td colspan="9" class="no-results">没有购买记录</td></tr>`;
                }
            } else {
                throw new Error(`服务器返回错误: ${response.status}`);
            }
        } catch (error) {
            console.error("Error fetching stock data:", error);
            stockTable.innerHTML = `<tr><td colspan="9" class="error-message">获取购买记录失败: ${error.message}</td></tr>`;
        }
    }
    
    // Display purchase history
    function displayPurchaseHistory(purchases) {
        if (!purchases || purchases.length === 0) {
            stockTable.innerHTML = `<tr><td colspan="9" class="no-results">没有购买记录</td></tr>`;
            return;
        }
        
        stockTable.innerHTML = '';
        
        // Calculate total
        let totalAmount = 0;
        
        purchases.forEach(purchase => {
            const quantity = parseInt(purchase.quantity_out || purchase.InvoiceNo || 0);
            const price = parseFloat(purchase.price || 0);
            const amount = quantity * price;
            totalAmount += amount;
            
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${purchase.ID || purchase.order_id || '无'}</td>
            <td>${purchase.Book || purchase.product_name || '无'}</td>
            <td>${formatDate(purchase.Date || purchase.purchase_date)}</td>
            <td>${purchase.quantity_out || purchase.used_quantity || '0'}</td>
            <td>${(purchase.quantity_in || 0) - (purchase.quantity_out || 0) || purchase.remaining_quantity || '0'}</td>
            <td>${formatCurrency(purchase.price || purchase.unit_price)}</td>
            <td>${formatCurrency(amount)}</td>
            <td>${purchase.Remarks || purchase.remarks || '无'}</td>
            `;
            
            stockTable.appendChild(row);
        });
        
        // Add total row
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = `
            <td colspan="6" class="total-label">总计</td>
            <td class="total-amount">${formatCurrency(totalAmount)}</td>
            <td></td>
        `;
        
        stockTable.appendChild(totalRow);
    }

    
    
    // Initialize page
    fetchMemberDetails();
    
    // Set up print function
    setupPrintFunction();
});