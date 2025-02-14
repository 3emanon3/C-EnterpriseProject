document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const memberForm = document.getElementById("memberForm");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const errorMessages = document.getElementById("errorMessages");
    const deleteButton = document.getElementById("deleteButton");
    
    // Function to validate form fields
    function validateForm() {
        const requiredFields = {
            'name': '姓名（英）',
            'cname': '姓名（中）',
            'designation': '种类',
            'address': '地址',
            'phone_number': '手机号码',
            'email': '邮箱',
            'IC': 'IC 号码',
            'gender': '性别',
            'birthday': '生日',
            'expired_date': '过期日期',
            'place_of_birth': '出生地方'
        };
        
        const errors = [];
        
        // Check required fields
        Object.entries(requiredFields).forEach(([field, label]) => {
            const element = document.getElementById(`member${field.charAt(0).toUpperCase() + field.slice(1)}`);
            if (!element || !element.value.trim()) {
                errors.push(`${label}是必填项`);
            }
        });

        // Validate email format
        const email = document.getElementById("memberEmail")?.value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push("邮箱格式不正确");
        }

        // Validate IC format (assuming format like: 123456-12-1234)
        const IC = document.getElementById("memberIC")?.value.trim();
        if (IC && !/^\d{6}-\d{2}-\d{4}$/.test(IC.replace(/[-]/g, '-'))) {
            errors.push("IC 号码格式不正确 (例: 123456-12-1234)");
        }

        if (errors.length > 0) {
            showErrors(errors);
            return false;
        }
        return true;
    }

    function showLoader() {
        loadingIndicator.style.display = "block";
    }

    function hideLoader() {
        loadingIndicator.style.display = "none";
    }

    function showErrors(errors) {
        errorMessages.innerHTML = errors.map(error => `<div>${error}</div>`).join('');
        errorMessages.style.display = "block";
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.textContent = message;
        errorMessages.parentNode.insertBefore(successDiv, errorMessages);
        setTimeout(() => successDiv.remove(), 3000);
    }

    function formatPhoneNumber(phone) {
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }

    function formatIC(IC) {
        return IC.replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3");
    }

    if (memberForm) {
        memberForm.addEventListener('submit', function (e) {
            e.preventDefault();
            errorMessages.style.display = "none";
            
            if (!validateForm()) return;
            
            showLoader();
            const formData = new FormData(this);
            
            formData.set('phone_number', formatPhoneNumber(formData.get('phone_number')));
            formData.set('IC', formatIC(formData.get('IC')));
            if (formData.get('oldIC')) {
                formData.set('oldIC', formatIC(formData.get('oldIC')));
            }

            fetch('../recervingAPI.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                hideLoader();
                if (result.status === 'success') {
                    showSuccess('会员信息保存成功');
                    setTimeout(() => window.location.href = '../member_management.html', 2000);
                } else {
                    showErrors([result.message || '保存失败']);
                }
            })
            .catch(error => {
                hideLoader();
                showErrors(['系统错误，请稍后再试']);
                console.error('Error:', error);
            });
        });
    }

    if (deleteButton) {
        deleteButton.addEventListener('click', function () {
            const memberId = document.getElementById('memberId')?.value;
            if (!memberId) return;

            if (confirm('确定要删除这个会员吗？')) {
                showLoader();
                fetch(`../recervingAPI.php?action=delete&id=${memberId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(result => {
                    hideLoader();
                    if (result.status === 'success') {
                        showSuccess('会员已删除');
                        setTimeout(() => window.location.href = 'index.html', 2000);
                    } else {
                        showErrors([result.message || '删除失败']);
                    }
                })
                .catch(error => {
                    hideLoader();
                    showErrors(['系统错误，请稍后再试']);
                    console.error('Error:', error);
                });
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    if (memberId) {
        showLoader();
        fetch(`../recervingAPI.php?action=get&id=${memberId}`)
            .then(response => response.json())
            .then(member => {
                hideLoader();
                if (member) {
                    Object.entries(member).forEach(([key, value]) => {
                        const element = document.getElementById(`member${key.charAt(0).toUpperCase() + key.slice(1)}`);
                        if (element) {
                            element.value = value;
                        }
                    });
                }
            })
            .catch(error => {
                hideLoader();
                showErrors(['加载会员信息失败']);
                console.error('Error:', error);
            });
    }
});