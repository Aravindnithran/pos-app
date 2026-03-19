import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDFsF9Ptip38ixPNSXDM8SpaTB7Rf4RH-M",
    authDomain: "h-pos-app.firebaseapp.com",
    databaseURL: "https://h-pos-app-default-rtdb.firebaseio.com",
    projectId: "h-pos-app",
    storageBucket: "h-pos-app.firebasestorage.app",
    messagingSenderId: "417866928315",
    appId: "1:417866928315:web:5864124e68e43e36ded99e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let items = JSON.parse(localStorage.getItem('myBillItems')) || [];
let cloudProducts = {}; 
let editIndex = -1; 

// --- 1. LOGIN LOGIC ---
window.checkLogin = function() {
    const pass = document.getElementById("adminPass").value;
    const correctPass = "123"; 

    if (pass === correctPass) {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("main-app").style.display = "block";
        sessionStorage.setItem("isLoggedIn", "true");
    } else {
        alert("தவறான பாஸ்வேர்ட்!");
    }
}

window.logout = function() {
    sessionStorage.removeItem("isLoggedIn");
    location.reload();
}

// --- 2. TAB MANAGEMENT ---
window.openTab = function(tabName) {
    let x = document.getElementsByClassName("tab-content");
    for (let i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
    document.getElementById(tabName).style.display = "block";
}

// --- 3. CLOUD DATA LISTENER ---
onValue(ref(db, 'products'), (snapshot) => {
    const data = snapshot.val();
    const dataList = document.getElementById("productSuggestions");
    const tableBody = document.querySelector("#cloudProductTable tbody");
    cloudProducts = data; 

    if (dataList) {
        dataList.innerHTML = ""; 
        if (data) {
            Object.keys(data).forEach(key => {
                let option = document.createElement("option");
                option.value = data[key].productName;
                dataList.appendChild(option);
            });
        }
    }

    if (tableBody) {
        tableBody.innerHTML = ""; 
        if (data) {
            Object.keys(data).forEach(key => {
                let row = tableBody.insertRow();
                row.insertCell(0).innerText = data[key].productName;
                row.insertCell(1).innerText = "₹" + data[key].productPrice;
                
                let stockCell = row.insertCell(2);
                let currentStock = data[key].productStock || 0;
                stockCell.innerText = currentStock;
                if(currentStock <= 5) stockCell.style.color = "red"; 

                let editStockCell = row.insertCell(3);
                let stockBtn = document.createElement("button");
                stockBtn.innerText = "Update Stock";
                stockBtn.style.cssText = "background:#ffc107; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-weight:bold;";
                stockBtn.onclick = () => window.updateStockAmount(key, currentStock);
                editStockCell.appendChild(stockBtn);

                let deleteCell = row.insertCell(4);
                let btn = document.createElement("button");
                btn.innerText = "❌";
                btn.style.cssText = "background:none; border:none; color:red; cursor:pointer; font-size:18px;";
                btn.onclick = () => window.deleteProduct(key);
                deleteCell.appendChild(btn);
            });
        }
    }
});

// --- 4. STOCK & BILLING FUNCTIONS ---
window.updateStockAmount = function(key, currentStock) {
    let newAmount = prompt("புதிய ஸ்டாக் அளவைத் தட்டச்சு செய்யவும்:", currentStock);
    if (newAmount !== null && newAmount !== "") {
        let updatedStock = parseFloat(newAmount);
        if (!isNaN(updatedStock)) {
            set(ref(db, 'products/' + key + '/productStock'), updatedStock)
            .then(() => alert("Stock Updated!"));
        }
    }
};

window.fillPrice = function() {
    let inputName = document.getElementById("itemName").value.trim().toLowerCase();
    const stockDisp = document.getElementById("currentProductStock");
    const priceInput = document.getElementById("itemPrice");

    let found = false;
    Object.keys(cloudProducts).forEach(key => {
        let p = cloudProducts[key];
        if (p.productName.trim().toLowerCase() === inputName) {
            priceInput.value = p.productPrice;
            stockDisp.innerText = p.productStock || "0";
            stockDisp.style.color = (p.productStock <= 5) ? "red" : "green";
            found = true;
            window.updateLiveTotal(); 
        }
    });
    if (!found) { stockDisp.innerText = "-"; }
}

// --- 5. BILLING LOGIC ---
window.updateBillTable = function() {
    let table = document.querySelector("#billTable tbody");
    let totalAmount = 0;
    if (table) {
        table.innerHTML = ""; 
        items.forEach((item, index) => {
            let row = table.insertRow();
            row.insertCell(0).innerText = item.name;
            row.insertCell(1).innerText = parseFloat(item.qty).toFixed(3);
            row.insertCell(2).innerText = "₹" + parseFloat(item.price).toFixed(2);
            row.insertCell(3).innerText = "₹" + parseFloat(item.total).toFixed(2);
            let actionCell = row.insertCell(4);
            actionCell.innerHTML = `
                <div style="display: flex; gap: 20px; justify-content: flex-start; align-items: center; padding: 10px 0;">
                    <span onclick="editItem(${index})" style="cursor:pointer; font-size:22px;">✏️</span>
                    <span onclick="removeItem(${index})" style="cursor:pointer; font-size:22px;">❌</span>
                </div>`;
            totalAmount += item.total;
        });
    }
    document.getElementById("totalAmount").innerText = totalAmount.toFixed(2);
}

// --- 5. BILLING LOGIC (Fixed for Add Item) ---

window.addItem = function() {
    const name = document.getElementById("itemName").value;
    const qty = parseFloat(document.getElementById("itemQty").value) || 0;
    const rate = parseFloat(document.getElementById("itemPrice").value) || 0;

    if (!name || qty <= 0 || rate <= 0) {
        alert("தயவுசெய்து சரியான விவரங்களை உள்ளிடவும்!");
        return;
    }

    const total = qty * rate;
    
    // உங்கள் பழைய ஸ்கிரிப்ட்டில் 'items' என்ற பெயரே பயன்படுத்தப்பட்டுள்ளது
    // எனவே 'items' லிஸ்டில் டேட்டாவைச் சேர்க்கிறோம்
    const newItem = { name, qty, price: rate, total }; // rate-ஐ price என மாற்றியுள்ளேன் (பிரிண்ட் எடுக்க வசதியாக)

    if (editIndex > -1) {
        items[editIndex] = newItem;
        editIndex = -1;
        document.querySelector('button[onclick="addItem()"]').innerText = 'ADD';
    } else {
        items.push(newItem);
    }

    // டேபிளை உடனே புதுப்பிக்க
    window.updateBillTable();

    // இன்புட் பாக்ஸ்களை கிளியர் செய்ய
    document.getElementById("itemName").value = "";
    document.getElementById("itemQty").value = "";
    document.getElementById("itemPrice").value = "";
    
    // லைவ் டோட்டலை 0 ஆக்க
    if(document.getElementById('liveTotalDisplay')) {
        document.getElementById('liveTotalDisplay').innerText = "Amount: ₹ 0.00";
    }
    
    // LocalStorage-ல் சேமிக்க (பிரிண்ட் எடுக்கும் வரை டேட்டா அழியாமல் இருக்க)
    localStorage.setItem('myBillItems', JSON.stringify(items));
};
window.updateLiveTotal = function() {
    let q = parseFloat(document.getElementById('itemQty').value) || 0;
    let r = parseFloat(document.getElementById('itemPrice').value) || 0;
    let total = q * r;
    
    // பாக்ஸில் தொகையைக் காட்ட
    const amtSpan = document.getElementById('currentProductAmount');
    if (amtSpan) { amtSpan.innerText = total.toFixed(2); }
}
////// bill generate logic with image
window.generateBill = function() {
    let finalTotal = parseFloat(document.getElementById("totalAmount").innerText);
    let cName = document.getElementById("customerName").value.trim();
    let cMobile = document.getElementById("customerMobile").value.trim();
    let pType = document.getElementById("paymentType").value;
    let finalCustomerName = cName !== "" ? cName : "Cash Customer";
    
    // --- புதிய செக் (Validation) இங்கே ---
    if (pType === "Credit") {
        if (cName === "" || cMobile === "") {
            alert("கடன் (Credit) பில் போட கஸ்டமர் பெயர் மற்றும் மொபைல் எண் கட்டாயம் தேவை!");
            return; // இதோடு இந்த பங்க்ஷன் நின்றுவிடும், பில் சேவ் ஆகாது.
        }
    }

    if (finalTotal === 0 || items.length === 0) return alert("பில் காலியாக உள்ளது!");
    
    try {
        push(ref(db, 'dailySales'), {
            customerName: finalCustomerName,
            customerMobile: cMobile,
            amount: finalTotal,
            paymentType: pType,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            items: items 
        });

        // generateBill-க்குள் இருக்கும் இந்த லூப்பில்:
        items.forEach(billItem => {
    Object.keys(cloudProducts).forEach(key => {
        if (cloudProducts[key].productName === billItem.name) {
            // பழைய ஸ்டாக் மற்றும் விற்ற அளவு இரண்டையும் parseFloat செய்கிறோம்
            let currentStock = parseFloat(cloudProducts[key].productStock || 0);
            let soldQty = parseFloat(billItem.qty);
            
            // கழித்த பிறகு வரும் விடையை 3 தசம இடங்களுக்கு (0.500) மாற்றி மீண்டும் எண்ணாக மாற்றுகிறோம்
            let newStock = parseFloat((currentStock - soldQty).toFixed(3));
            
            set(ref(db, 'products/' + key + '/productStock'), newStock);
        }
    });
});
    } catch (e) { console.error("Firebase Error:", e); }

    let billDiv = document.createElement("div");
    billDiv.style.cssText = "width:380px; padding:30px; background:#fff; color:#000; font-family:'Helvetica', Arial, sans-serif; position:fixed; top:-9999px; left:-9999px; border: 1px solid #eee;";
    
    billDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 15px;">
            <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">AYYAPPAN STORE</h1>
            <p style="margin: 5px 0; font-size: 14px;">No:135, P.H. ROAD, MADURAVOYAL</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Cell: 9943514861</p>
        </div>
        <div style="margin-bottom: 15px; font-size: 14px; display: flex; justify-content: space-between;">
            <span><b>Date:</b> ${new Date().toLocaleDateString()}</span>
            <span><b>Time:</b> ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="margin-bottom: 15px; font-size: 14px;">
            <p style="margin: 0;"><b>Customer:</b> ${finalCustomerName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 2px solid #000;">
                    <th style="text-align: left; padding: 8px 0;">ITEM</th>
                    <th style="text-align: center;">QTY</th>
                    <th style="text-align: center;">RATE</th>
                    <th style="text-align: right;">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(i => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px 0; font-weight: bold;">${i.name}</td>
                        <td style="text-align: center;">${parseFloat(i.qty).toFixed(3)}</td>
                        <td style="text-align: center;">${parseFloat(i.price || i.rate).toFixed(2)}</td>
                        <td style="text-align: right;">${parseFloat(i.total).toFixed(2)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
        <div style="margin-top: 20px; border-top: 3px solid #000; padding-top: 15px; text-align: right;">
            <span style="font-size: 14px; font-weight: bold;">GRAND TOTAL</span><br>
            <b style="font-size: 24px;">₹${finalTotal.toFixed(2)}</b>
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 13px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <p style="margin: 3px 0; font-weight: bold;">Thank you! Visit Again!</p>
            <p style="margin: 3px 0; color: #777;">Digital Receipt via NIHA POS</p>
        </div>
    `;
    document.body.appendChild(billDiv);

    html2canvas(billDiv, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
    }).then(canvas => {
        canvas.toBlob(blob => {
            const file = new File([blob], `Bill_${finalCustomerName}.png`, { type: "image/png" });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'AYYAPPAN STORE - Bill',
                    text: `Bill for ${finalCustomerName}`
                }).then(() => cleanup()).catch(() => cleanup());
            } else {
                let link = document.createElement("a");
                link.download = `Bill_${finalCustomerName}.png`;
                link.href = canvas.toDataURL("image/png", 1.0);
                link.click();
                cleanup();
            }
        }, "image/png", 1.0);
    });

    // --- முக்கிய மாற்றம் இங்கே ---
    function cleanup() {
        if (document.body.contains(billDiv)) {
            document.body.removeChild(billDiv);
        }
        // கன்பார்ம் மெசேஜ் இல்லாமல் கிளியர் செய்ய:
        items = []; 
        localStorage.removeItem('myBillItems');
        document.getElementById("customerName").value = "";
        document.getElementById("customerMobile").value = "";
        document.getElementById("paymentType").value = "Cash";
        window.updateBillTable(); 
        console.log("Bill cleared silently");
    }
};
// --- 7. RENDER SALES TABLE (FIXED) ---
function renderSalesTable(salesData, filterDate = null, filterType = "All") {
    const reportTableBody = document.querySelector("#salesReportTable tbody");
    if (!reportTableBody) return;
    reportTableBody.innerHTML = "";
    
    let cashTotal = 0, gpayTotal = 0, creditTotal = 0, grandTotal = 0;

    if (salesData) {
        Object.keys(salesData).reverse().forEach(key => {
            const sale = salesData[key];
            const pType = sale.paymentType || 'Cash';
            
            // தேதி மற்றும் வகை (Cash/GPay/Credit) இரண்டையும் சரிபார்க்கிறது
            const dateMatch = (!filterDate || sale.date === filterDate);
            const typeMatch = (filterType === "All" || pType === filterType);

            if (dateMatch && typeMatch) {
                let amt = parseFloat(sale.amount || 0);
                grandTotal += amt;

                if(pType === "Cash") cashTotal += amt;
                else if(pType === "GPay") gpayTotal += amt;
                else if(pType === "Credit") creditTotal += amt;

                let row = reportTableBody.insertRow();
                let nameCell = row.insertCell(0);
                nameCell.innerHTML = `
                    <div style="font-size: 13px; font-weight: bold;">${sale.customerName || 'Cash Customer'}</div>
                    <div style="font-size: 11px; color: #555;">${sale.date} ${sale.time}</div>
                `;

                let payColor = (pType === "GPay") ? "blue" : (pType === "Credit" ? "red" : "green");
                let amountCell = row.insertCell(1);
                amountCell.innerHTML = `
                    <div style="font-weight: bold; font-size: 15px;">₹${amt.toFixed(2)}</div>
                    <div style="font-size: 11px; color: ${payColor}; font-weight: bold;">● ${pType}</div>
                `;

                let actionCell = row.insertCell(2);
                actionCell.style.display = "flex"; actionCell.style.gap = "5px";
                actionCell.innerHTML = `
                    <button onclick='window.showSaleDetails(${JSON.stringify(sale.items)}, "${sale.customerName}")' 
                            style="padding:8px; background:#000; color:#fff; border:none; border-radius:3px; font-size:11px;">VIEW</button>
                    <button onclick='window.editOldBill("${key}", ${JSON.stringify(sale)})' 
                            style="padding:8px; background:#2196F3; color:#fff; border:none; border-radius:3px; font-size:11px;">✏️</button>
                    <button onclick="window.deleteSaleItem('${key}')" 
                            style="padding:8px; background:#ff4d4d; color:#fff; border:none; border-radius:3px; font-size:11px;">🗑️</button>
                `;
            }
        });
    }

    // டோட்டல் அப்டேட்கள்
    if(document.getElementById("cashTotalDisp")) document.getElementById("cashTotalDisp").innerText = cashTotal.toFixed(2);
    if(document.getElementById("gpayTotalDisp")) document.getElementById("gpayTotalDisp").innerText = gpayTotal.toFixed(2);
    if(document.getElementById("creditTotalDisp")) document.getElementById("creditTotalDisp").innerText = creditTotal.toFixed(2);
    if(document.getElementById("filteredTotal")) document.getElementById("filteredTotal").innerText = grandTotal.toFixed(2);
}
// --- 8. SALES DATA LISTENER ---
onValue(ref(db, 'dailySales'), (snapshot) => {
    const salesData = snapshot.val();
    const today = new Date().toLocaleDateString();
    renderSalesTable(salesData, today); 
});

// --- புதிய ஃபங்ஷன்: பழைய பில்லை எடிட் செய்ய ---
// --- பழைய பில்லை எடிட் செய்ய (S corrected window name) ---
window.editOldBill = function(saleId, saleData) {
    if(confirm("இந்த பில்லை மாற்றி அமைக்க வேண்டுமா?")) {
        
        // 1. ஸ்டாக்கை பழைய நிலைக்கு கொண்டு வருதல்
        if (saleData.items) {
            saleData.items.forEach(oldItem => {
                Object.keys(cloudProducts).forEach(key => {
                    if (cloudProducts[key].productName === oldItem.name) {
                        let restoredStock = (parseFloat(cloudProducts[key].productStock) || 0) + parseFloat(oldItem.qty);
                        set(ref(db, 'products/' + key + '/productStock'), restoredStock);
                    }
                });
            });
        }

        // 2. விவரங்களை லோடு செய்தல்
        items = saleData.items;
        localStorage.setItem('myBillItems', JSON.stringify(items));
        
        if(document.getElementById("customerName")) document.getElementById("customerName").value = saleData.customerName || "";
        if(document.getElementById("customerMobile")) document.getElementById("customerMobile").value = saleData.customerMobile || "";
        if(document.getElementById("paymentType")) document.getElementById("paymentType").value = saleData.paymentType || "Cash";
        
        // 3. பழைய பில்லை நீக்குதல்
        remove(ref(db, 'dailySales/' + saleId));

        window.openTab('billing-tab');
        window.updateBillTable();
    }
};

// --- 9. DATE FILTER LOGIC ---
window.filterBy = function(type) {
    // 1. உங்கள் ரிப்போர்ட்டில் உள்ளது போலவே (M/D/YYYY) தேதியை எடுக்கிறோம்
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    // உங்கள் ரிப்போர்ட்டில் 3/20/2026 என்று இருப்பதால் அதே பார்மட்:
    const today = `${month}/${day}/${year}`; 

    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        if (!salesData) return alert("டேட்டாபேஸில் விவரங்கள் இல்லை!");

        if (type === 'Today') {
            // இப்போது இன்றைய தேதி சரியாக மேட்ச் ஆகும்
            const hasTodaySales = Object.values(salesData).some(sale => sale.date === today);
            
            if (!hasTodaySales) {
                alert("இன்று (" + today + ") இன்னும் விற்பனை எதுவும் செய்யப்படவில்லை!");
                renderSalesTable({}, today, "All");
            } else {
                renderSalesTable(salesData, today, "All");
            }
        } else {
            // Cash, GPay, Credit பட்டன்களுக்கு
            renderSalesTable(salesData, null, type);
        }
    }, { onlyOnce: true });
};

window.resetFilter = function() {
    document.getElementById("searchDate").value = "";
    if(document.getElementById("filteredTotal")) document.getElementById("filteredTotal").innerText = "0";
    
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        renderSalesTable(salesData); // அனைத்தையும் காட்டும்
    }, { onlyOnce: true });
};

// --- 10. DELETE SALE ---
window.deleteSaleItem = function(saleId) {
    let password = prompt("விற்பனையை நீக்க Password உள்ளிடவும்:");
    const SECRET_KEY = "1234"; 

    if (password === SECRET_KEY) {
        if (confirm("நிச்சயமாக இந்த பில்லை மட்டும் நீக்க வேண்டுமா?")) {
            remove(ref(db, 'dailySales/' + saleId)).then(() => alert("நீக்கப்பட்டது!"));
        }
    } else if (password !== null) {
        alert("தவறான பாஸ்வேர்ட்!");
    }
}

// --- 11. POPUP BOX (MODAL) LOGIC ---
window.showSaleDetails = function(items, cName, cMobile) {
    const modal = document.getElementById('salesModal');
    const content = document.getElementById('modalContent');
    
    let html = `
        <div style="background:#f1f8e9; padding:10px; border-radius:5px; margin-bottom:15px; border-left:5px solid #4CAF50;">
            <p style="margin:0; font-weight:bold; color:#2e7d32;">Customer: ${cName || 'Cash Customer'}</p>
            <p style="margin:5px 0 0 0; font-size:13px; color:#666;">Mobile: ${cMobile || 'N/A'}</p>
        </div>
    `;

    html += "<table style='width:100%; border-collapse:collapse; font-family: sans-serif;'>";
    html += "<tr style='background:#f5f5f5; border-bottom:2px solid #ddd;'><th style='text-align:left; padding:8px;'>Item</th><th style='text-align:right; padding:8px;'>Qty</th></tr>";
    
    items.forEach(item => {
        html += `<tr style='border-bottom:1px solid #eee;'>
                    <td style='padding:10px 8px;'>${item.name}</td>
                    <td style='text-align:right; padding:10px 8px;'>${parseFloat(item.qty).toFixed(3)}</td>
                 </tr>`;
    });
    html += "</table>";
    
    content.innerHTML = html;
    modal.style.display = 'flex'; 
};

window.saveToCloud = function() {
    const name = document.getElementById("pName").value;
    const price = document.getElementById("pPrice").value;
    const stock = document.getElementById("pStock").value;
    if(name && price && stock) {
        push(ref(db, 'products'), { productName: name, productPrice: price, productStock: parseFloat(stock) })
        .then(() => { alert("Saved!"); document.getElementById("pName").value = ""; document.getElementById("pPrice").value = ""; document.getElementById("pStock").value = ""; });
    }
}

// பில்லை கிளியர் செய்யும் போது இன்புட்களையும் கிளியர் செய்ய
window.clearBill = function() {
    if (confirm("நிச்சயமாக பில்லை நீக்க வேண்டுமா?")) {
        // டேபிளை காலி செய்தல்
        const billBody = document.querySelector("#billTable tbody");
        if (billBody) billBody.innerHTML = "";
        
        // தொகைகளை 0 ஆக்குதல்
        document.getElementById("totalAmount").innerText = "0";
        
        // கஸ்டமர் விவரங்களை கிளியர் செய்தல்
        document.getElementById("customerName").value = "";
        document.getElementById("customerMobile").value = "";
        document.getElementById("paymentType").value = "Cash";
        
        // லோக்கல் ஸ்டோரேஜை கிளியர் செய்தல் (நீங்கள் பயன்படுத்தினால்)
        localStorage.removeItem("currentBillItems");
        
        alert("பில் வெற்றிகரமாக நீக்கப்பட்டது!");
    }
};

// பில் பிரிண்ட் செய்த பிறகு தானாக கிளியர் ஆக வேண்டுமானால் 
// generateBill() ஃபங்ஷனின் இறுதியில் window.clearBill() -ஐ கால் செய்யலாம்.

window.removeItem = function(index) { 
    items.splice(index, 1); 
    localStorage.setItem('myBillItems', JSON.stringify(items)); 
    window.updateBillTable();
}

window.editItem = function(index) {
    let item = items[index];
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemQty").value = item.qty;
    document.getElementById("itemPrice").value = item.price;
    editIndex = index;
    document.querySelector('button[onclick="addItem()"]').innerText = 'UPDATE';
    window.updateLiveTotal();
}

window.deleteProduct = function(key) { if(confirm("Delete product?")) remove(ref(db, 'products/' + key)); 

}

/// --- 12. ADVANCED FILTER (கஸ்டமர் பெயர் மற்றும் தெளிவான பில்டர் வசதி) ---
window.applyAdvancedFilter = function() {
    const searchDate = document.getElementById("searchDate").value;
    const payType = document.getElementById("filterPaymentType").value;
    
    // தேதி இல்லை என்றால் இன்றைய தேதியை எடுக்கும்
    let formattedDate = searchDate ? new Date(searchDate).toLocaleDateString() : new Date().toLocaleDateString();

    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        const reportTableBody = document.querySelector("#salesReportTable tbody");
        if (!reportTableBody) return;

        reportTableBody.innerHTML = "";
        let filteredSum = 0;

        if (salesData) {
            Object.keys(salesData).reverse().forEach(key => {
                const sale = salesData[key];
                const salePayType = sale.paymentType || 'Cash';

                const dateMatch = (sale.date === formattedDate);
                const typeMatch = (payType === "All" || salePayType === payType);

                if (dateMatch && typeMatch) {
                    filteredSum += parseFloat(sale.amount || 0);
                    let row = reportTableBody.insertRow();
                    
                    // 1. கஸ்டமர் பெயர் மற்றும் தேதி நேரம் (இங்கேதான் பெயர் தெரியும்)
                    let nameCell = row.insertCell(0);
                    nameCell.innerHTML = `
                        <div style="font-size: 14px; font-weight: bold; color: #000;">${sale.customerName || 'Cash Customer'}</div>
                        <div style="font-size: 11px; color: #555;">${sale.date} ${sale.time}</div>
                    `;

                    let payColor = (salePayType === "GPay") ? "blue" : (salePayType === "Credit" ? "red" : "green");

                    // 2. தொகை மற்றும் பேமெண்ட் முறை
                    let amountCell = row.insertCell(1);
                    amountCell.innerHTML = `
                        <div style="font-weight:bold; font-size:15px;">₹${parseFloat(sale.amount).toFixed(2)}</div>
                        <div style="font-size:11px; color:${payColor}; font-weight:bold;">● ${salePayType}</div>
                    `;

                    // 3. ஆக்ஷன் பட்டன்கள்
                    let actionCell = row.insertCell(2);
                    actionCell.style.display = "flex"; actionCell.style.gap = "8px";
                    actionCell.innerHTML = `
                        <button onclick='window.showSaleDetails(${JSON.stringify(sale.items)}, "${sale.customerName}", "${sale.customerMobile}")' 
                                style="padding:6px; background:#000; color:#fff; border:none; border-radius:3px; font-size:12px; cursor:pointer;">View</button>
                        <button onclick='window.editOldBill("${key}", ${JSON.stringify(sale)})' 
                                style="padding:6px; background:#2196F3; color:#fff; border:none; border-radius:3px; font-size:12px; cursor:pointer;">✏️</button>
                    `;
                }
            });
        }
        
        // மொத்த தொகையை அப்டேட் செய்தல்
        const todayTotal = document.getElementById("todayTotal");
        const filteredTotal = document.getElementById("filteredTotal");
        if (searchDate) { if(filteredTotal) filteredTotal.innerText = filteredSum.toFixed(2); }
        else { if(todayTotal) todayTotal.innerText = filteredSum.toFixed(2); }
        
    }, { onlyOnce: true });
};

// --- 13. இன்றைய விற்பனையை Billing Tab-ல் காட்ட (புதிய வசதி) ---
window.updateBillingTabTotal = function() {
    // 1. தேதியை உங்கள் ரிப்போர்ட் மற்றும் சிஸ்டம் பார்மட்டில் (M/D/YYYY) எடுக்கிறோம்
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = `${month}/${day}/${year}`; // இதுதான் 3/20/2026 என்று வரும்

    // Firebase-ல் இருந்து விற்பனை விவரங்களை எடுத்தல்
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        let tTotal = 0, tCash = 0, tGpay = 0, tCredit = 0;

        if (salesData) {
            Object.values(salesData).forEach(sale => {
                // பில்லில் உள்ள தேதியும் இன்றைய தேதியும் சரியாக இருக்கிறதா என்று பார்க்கிறோம்
                if (sale.date === today) {
                    let amt = parseFloat(sale.amount || 0);
                    tTotal += amt;
                    
                    let pType = sale.paymentType || 'Cash';
                    if (pType === "Cash") tCash += amt;
                    else if (pType === "GPay") tGpay += amt;
                    else if (pType === "Credit") tCredit += amt;
                }
            });
        }

        // 2. Billing Tab-ல் உள்ள ஐடிகளில் அப்டேட் செய்தல்
        // உங்கள் HTML-ல் உள்ள ID-களுக்கு ஏற்ப இங்கே மாற்றியுள்ளேன்
        if(document.getElementById("billTodayCash")) document.getElementById("billTodayCash").innerText = tCash.toFixed(0);
        if(document.getElementById("billTodayGpay")) document.getElementById("billTodayGpay").innerText = tGpay.toFixed(0);
        if(document.getElementById("billTodayCredit")) document.getElementById("billTodayCredit").innerText = tCredit.toFixed(0);
        
        // 3. "இன்றைய மொத்த விற்பனை" பெரிய பாக்ஸில் அப்டேட் செய்தல்
        const grandTotalSpan = document.getElementById("billingTabGrandTotal");
        if (grandTotalSpan) {
            grandTotalSpan.innerText = tTotal.toFixed(0);
        }
    });
};

// ஆப் லோட் ஆகும்போதே இதை ஒருமுறை கூப்பிடுகிறோம்
window.updateBillingTabTotal();

//14. கஸ்டமர் பெயர் அடித்து தேட (Search by Name) - சிங்கிள் ஃபங்க்ஷன்
window.searchByCustomer = function() {
    // 1. தேடும் பெயரை எடுக்கிறோம்
    const searchInput = document.getElementById("searchCustomerName");
    if (!searchInput) return;
    const searchName = searchInput.value.toLowerCase();
    
    // 2. Firebase-ல் இருந்து டேட்டாவை எடுக்கிறோம்
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        if (!salesData) return;

        const filteredData = {};
        
        // 3. பெயருக்கு ஏற்றவாறு டேட்டாவை பிரிக்கிறோம்
        Object.keys(salesData).forEach(key => {
            const sale = salesData[key];
            const customerName = (sale.customerName || "").toLowerCase();
            
            // பெயர் மேட்ச் ஆனால் மட்டும் லிஸ்டில் சேர்க்கும்
            if (customerName.includes(searchName)) {
                filteredData[key] = sale;
            }
        });

        // 4. உங்கள் மெயின் ரிப்போர்ட் டேபிளில் காட்டுகிறோம்
        // இரண்டாவது ஆர்குமெண்ட் 'null' என்பதால் எல்லா தேதியிலும் உள்ள அந்த பெயர் வரும்
        if (typeof renderSalesTable === "function") {
            renderSalesTable(filteredData, null); 
        }
    }, { onlyOnce: true });
};

///15. Outstanding பட்டனை அழுத்தினால் வரும் கஸ்டமர் லிஸ்ட்
window.showOutstandingBalance = function() {
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        if (!salesData) return;

        let customers = {};
        Object.keys(salesData).forEach(key => {
            const sale = salesData[key];
            if (sale.paymentType === "Credit" && sale.customerName) {
                if (!customers[sale.customerName]) customers[sale.customerName] = 0;
                customers[sale.customerName] += parseFloat(sale.amount);
            }
        });

        const modal = document.getElementById('salesModal');
        const content = document.getElementById('modalContent');
        
        let html = "<h3>Outstanding Customers</h3><table style='width:100%; border-collapse:collapse;'>";
        html += "<tr style='background:#eee;'><th>Name</th><th>Total Due</th><th>View</th></tr>";
        
        Object.keys(customers).forEach(name => {
            html += `<tr style='border-bottom:1px solid #ddd;'>
                <td style='padding:10px;'>${name}</td>
                <td style='color:red; font-weight:bold;'>₹${customers[name].toFixed(2)}</td>
                <td><button onclick='window.viewIndividualCredit("${name}")' style='background:#000; color:#fff; padding:5px;'>VIEW</button></td>
            </tr>`;
        });
        html += "</table>";
        content.innerHTML = html;
        modal.style.display = 'flex';
    }, { onlyOnce: true });
};

// 16. கஸ்டமரை செலக்ட் செய்த பிறகு அவர்களின் பில்கள் மட்டும் காட்ட
window.viewIndividualCredit = function(name) {
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        const content = document.getElementById('modalContent');
        if (!content) return;

        let html = `<h3 style="margin-bottom:10px; color:#333;">Bills for ${name}</h3>`;
        html += "<table style='width:100%; border-collapse:collapse; font-size:13px;'>";
        html += "<tr style='background:#f2f2f2; text-align:left;'><th style='padding:8px;'>Date</th><th style='padding:8px;'>Amount</th><th style='padding:8px; text-align:center;'>Action</th></tr>";

        if (salesData) {
            Object.keys(salesData).forEach(key => {
                const sale = salesData[key];
                // அந்த கஸ்டமரின் 'Credit' பில்களை மட்டும் காட்டுகிறது
                if (sale.customerName === name && sale.paymentType === "Credit") {
                    let amt = parseFloat(sale.amount || 0);
                    html += `<tr style='border-bottom:1px solid #eee;'>
                        <td style='padding:10px;'>${sale.date}</td>
                        <td style='padding:10px; font-weight:bold;'>₹${amt.toFixed(0)}</td>
                        <td style='padding:10px; text-align:center;'>
                            <button onclick='window.makePayment("${key}", "${name}", ${amt})' 
                                    style='background:#3498db; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;'>வசூல்</button>
                        </td>
                    </tr>`;
                }
            });
        }
        
        html += "</table>";
        html += "<br><button onclick='window.showOutstandingBalance()' style='width:100%; padding:12px; background:#000; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;'>BACK TO LIST</button>";
        content.innerHTML = html;
    }, { onlyOnce: true });
};
////17. பழைய தேதிகளைத் தேட உதவும் ஃபங்க்ஷன்
window.filterBySelectedDate = function() {
    const datePicker = document.getElementById("searchDate");
    if (!datePicker || !datePicker.value) return;

    // 1. காலண்டர் தரும் தேதியை (YYYY-MM-DD) எடுக்கிறோம்
    const dateObj = new Date(datePicker.value);
    
    // 2. அதை உங்கள் டேட்டாபேஸ் பார்மட் (M/D/YYYY) படி மாற்றுகிறோம்
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    const formattedDate = `${month}/${day}/${year}`; 

    // 3. Firebase-ல் இருந்து தரவை எடுத்து டேபிளில் காட்டுகிறோம்
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        if (!salesData) return;

        // renderSalesTable-ஐ கூப்பிட்டு அந்தத் தேதியை மட்டும் காட்டச் சொல்கிறோம்
        if (typeof renderSalesTable === "function") {
            renderSalesTable(salesData, formattedDate, "All");
        }
    }, { onlyOnce: true });
};

//18. கடனை வரவு வைக்கும் மெயின் பங்க்ஷன்
let currentBillData = {}; // தற்காலிகமாக டேட்டாவைச் சேமிக்க

// வசூல் பட்டனை அழுத்தியதும் பாப்-அப் திறக்கும்
window.makePayment = function(billKey, custName, billAmount) {
    currentBillData = { key: billKey, name: custName, amount: billAmount };
    
    document.getElementById("payCustName").innerText = custName;
    document.getElementById("payBillAmt").innerText = "₹" + billAmount;
    document.getElementById("paidInput").value = billAmount; // டீபால்ட்டாக மொத்த தொகை
    document.getElementById("paymentModal").style.display = "flex";
    document.getElementById("paidInput").focus();
};

window.closePaymentModal = function() {
    document.getElementById("paymentModal").style.display = "none";
};

// CONFIRM பட்டனை அழுத்தியதும் நடக்கும் செயல்
// 1. வசூல் செய்யும் மெயின் பங்க்ஷன்
// 1. வசூல் செய்யும் மெயின் பங்க்ஷன்
// 1. வசூல் செய்யும் மெயின் பங்க்ஷன் (திருத்தப்பட்டது)
window.processPayment = function() {
    console.log("Process Payment Started...");

    let paidInput = document.getElementById("paidInput");
    let paidAmount = parseFloat(paidInput.value);
    
    // HTML-ல் நாம் புதிதாகச் சேர்த்த Dropdown-ல் இருந்து மதிப்பை எடுக்கிறோம்
    let selectedMode = document.getElementById("payMode").value; 
    
    if (isNaN(paidAmount) || paidAmount <= 0) {
        alert("சரியான தொகையை உள்ளிடவும்!");
        return;
    }

    // Firebase References
    const billRef = ref(db, 'dailySales/' + currentBillData.key);
    const now = new Date();
    const today = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

    // பட்டனை டிஸேபிள் செய்கிறோம்
    const confirmBtn = document.querySelector("button[onclick*='processPayment']");
    if(confirmBtn) confirmBtn.disabled = true;

    if (paidAmount >= currentBillData.amount) {
        // அ. முழு வசூல்: நீங்கள் தேர்ந்தெடுத்த Mode (Cash/GPay) இங்கே அப்டேட் ஆகும்
        update(billRef, {
            paymentType: selectedMode, 
            paidStatus: "Full Paid",
            paidDate: today
        }).then(() => {
            window.finalizePayment(`முழுத் தொகையும் (${selectedMode}) வரவு வைக்கப்பட்டது!`);
        }).catch(err => {
            alert("Error: " + err.message);
            if(confirmBtn) confirmBtn.disabled = false;
        });

    } else {
        // ஆ. பகுதி வசூல் (Partial Payment)
        const remaining = currentBillData.amount - paidAmount;
        
        update(billRef, { 
            amount: remaining,
            partialUpdate: "Yes" 
        }).then(() => {
            // பெற்ற தொகைக்கு புதிய என்ட்ரி போடும்போது சரியான Mode-ஐச் சேர்க்கிறோம்
            const newBillRef = push(ref(db, 'dailySales'));
            set(newBillRef, {
                customerName: currentBillData.name,
                amount: paidAmount,
                date: today,
                paymentType: selectedMode, // Cash-ஆ அல்லது GPay-வா என இங்கே சேமிக்கப்படும்
                items: [{name: "கடன் வசூல் (Partial)", qty: 1, rate: paidAmount, total: paidAmount}],
                time: now.toLocaleTimeString()
            }).then(() => {
                window.finalizePayment(`₹${paidAmount} (${selectedMode}) வரவு வைக்கப்பட்டது. மீதி ₹${remaining} கடனில் உள்ளது.`);
            });
        }).catch(err => {
            alert("Error: " + err.message);
            if(confirmBtn) confirmBtn.disabled = false;
        });
    }
};

// 2. வெற்றிகரமாக முடிந்ததும் செய்யும் வேலைகள்
window.finalizePayment = function(msg) {
    alert(msg);
    window.closePaymentModal();
    
    if(typeof window.viewIndividualCredit === "function") {
        window.viewIndividualCredit(currentBillData.name);
    }
    if(typeof window.updateBillingTabTotal === "function") {
        window.updateBillingTabTotal();
    }
    
    const confirmBtn = document.querySelector("button[onclick*='processPayment']");
    if(confirmBtn) confirmBtn.disabled = false;
};

//19. கடைசியாகப் போட்ட 5 பில்களைக் காட்டுதல்
window.showRecentBillsForModify = function() {
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const data = snapshot.val();
        const listDiv = document.getElementById("modifyList");
        listDiv.innerHTML = "";
        
        if (!data) { listDiv.innerHTML = "No bills found!"; return; }

        // பில்களைத் தேதியின் அடிப்படையில் வரிசைப்படுத்தி கடைசி 5-ஐ எடுக்கிறோம்
        const keys = Object.keys(data).reverse().slice(0, 5);
        
        keys.forEach(key => {
            const bill = data[key];
            listDiv.innerHTML += `
                <div style="padding:10px 12px; border-bottom:1px solid #20331a; display:flex; justify-content:space-between; align-items:center; background:#fff; margin-bottom:5px; border-radius:8px;">
        <div style="flex:1; text-align:left;">
            <div style="font-weight:bold; color:#20331a; font-size:14px; margin-bottom:2px;">
                ${bill.customerName || 'Cash Customer'}
            </div>
            <div style="font-size:18px; color:#008000;">
                📱 ${bill.whatsappNo || bill.mobile || 'No Number'} | ₹${bill.amount}
            </div>
            <div style="font-size:10px; color:#999;">${bill.time}</div>
        </div>
        
        <button onclick="window.loadBillToEdit('${key}')" 
                style="background:#27ae60; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; width:auto;">
            EDIT
        </button>
    </div>`;
        });
        document.getElementById("modifyModal").style.display = "flex";
    }, { onlyOnce: true });
};

// பில்லை மீண்டும் எடிட்டிங் மோடுக்கு கொண்டு வருதல்
window.loadBillToEdit = function(billKey) {
    if (!confirm("இந்த பில்லை எடிட் செய்யலாமா? பழைய பில் நீக்கப்பட்டு பொருட்கள் மீண்டும் லிஸ்டில் வரும்.")) return;

    onValue(ref(db, 'dailySales/' + billKey), (snapshot) => {
        const bill = snapshot.val();
        if (!bill) return;

        // 1. கஸ்டமர் விவரங்களை மீண்டும் கொண்டு வருதல்
        document.getElementById("customerName").value = bill.customerName || "";
        document.getElementById("whatsappNo").value = bill.whatsappNo || "";
        
        // 2. பொருட்களை மீண்டும் Billing Array-க்கு மாற்றுதல்
        // (குறிப்பு: உங்கள் ஸ்கிரிப்ட்டில் பில் பொருட்களைச் சேமிக்கும் அரே பெயர் 'cart' அல்லது 'items' என இருந்தால் அதை மாற்றவும்)
        if (typeof window.setBillingItems === "function") {
            window.setBillingItems(bill.items); 
        } else {
            // ஒருவேளை நேரடி வேரியபிள் இருந்தால்:
            billingItems = bill.items; 
            renderTable(); // டேபிளை புதுப்பிக்க
        }

        // 3. பழைய பில்லை நீக்குதல்
        remove(ref(db, 'dailySales/' + billKey)).then(() => {
            document.getElementById("modifyModal").style.display = "none";
            alert("பில் எடிட் மோடுக்கு மாறியது. மாற்றங்களைச் செய்து மீண்டும் பில் போடவும்.");
            if(window.updateBillingTabTotal) window.updateBillingTabTotal();
        });

    }, { onlyOnce: true });
};