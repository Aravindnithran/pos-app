let total = 0;
let items = JSON.parse(localStorage.getItem('myBillItems')) || [];

// கோடை ரன் செய்ததும் ஒருமுறை இதை மட்டும் இயக்கவும் (இயக்கிய பிறகு இந்த வரியை நீக்கிவிடலாம்)
localStorage.clear();

// பக்கத்தை திறக்கும்போது பழைய பில்லைக் காட்டுதல்
window.onload = function() {
    items.forEach(item => displayItem(item.name, item.price));
    updateTotal();
};


function addItem() {
    let name = document.getElementById("itemName").value;
    let qty = parseInt(document.getElementById("itemQty").value); // Qty-ஐ எண் வடிவத்திற்கு மாற்றுகிறோம்
    let price = parseFloat(document.getElementById("itemPrice").value); // விலையை எண் வடிவத்திற்கு மாற்றுகிறோம்

    if (name && !isNaN(qty) && !isNaN(price)) {
        let totalItemPrice = qty * price; // இங்கேதான் Qty * Price கணக்கிடப்படுகிறது
        
        let item = { name: name, qty: qty, price: price, total: totalItemPrice };
        
        items.push(item);
        localStorage.setItem('myBillItems', JSON.stringify(items));
        
        displayItem(item); 
        updateTotal();

        document.getElementById("itemName").value = "";
        document.getElementById("itemQty").value = "";
        document.getElementById("itemPrice").value = "";
    } else {
        alert("தயவுசெய்து அனைத்து விவரங்களையும் சரியாக நிரப்பவும்!");
    }
}

function displayItem(item) {
    let table = document.getElementById("billTable").getElementsByTagName('tbody')[0];
    let row = table.insertRow();
    
    // இங்கே உள்ள பெயர்கள் நீங்கள் ஆப்ஜெக்டில் சேமித்த பெயர்களுடன் ஒத்துப்போக வேண்டும்
    row.insertCell(0).innerHTML = item.name;   // பெயர்
    row.insertCell(1).innerHTML = item.qty;    // அளவு
    row.insertCell(2).innerHTML = "₹" + item.price; // விலை
    row.insertCell(3).innerHTML = "₹" + item.total; // மொத்தம்
}

// updateTotal பங்க்ஷனிலும் சிறிய மாற்றம்:
function updateTotal() {
    total = items.reduce((sum, item) => sum + item.total, 0); // மொத்தத் தொகையைக் கூட்டுதல்
    document.getElementById("totalAmount").innerText = total;
}
//function addItem() {
//    let name = document.getElementById("itemName").value;
//    let price = parseFloat(document.getElementById("itemPrice").value);

//    if (name && price) {
//        let item = { name: name, price: price };
//        items.push(item);
//        localStorage.setItem('myBillItems', JSON.stringify(items));
        
//        displayItem(name, price);
//        updateTotal();

//        document.getElementById("itemName").value = "";
//        document.getElementById("itemPrice").value = "";
//    } else {
//        alert("தயவுசெய்து விபரங்களை நிரப்பவும்!");
//    }
//}

//function displayItem(name, price) {
  //  let table = document.getElementById("billTable").getElementsByTagName('tbody')[0];
  //  let row = table.insertRow();
  //  row.insertCell(0).innerHTML = name;
  //  row.insertCell(1).innerHTML = item.qty;
   // row.insertCell(2).innerHTML = "₹" + price;
   // row.insertCell(3).innerHTML = "₹" + total;
    //row.insertCell(2).innerHTML = "₹" + item.price.toFixed(2);
//row.insertCell(3).innerHTML = "₹" + item.total.toFixed(2);
//}

//function updateTotal() {
//    total = items.reduce((sum, item) => sum + item.price, 0);
//    document.getElementById("totalAmount").innerText = total;
//}

function generateBill() {
    window.print();
}

// பில்லை முழுவதுமாக அழிக்க (புதிய பில் ஆரம்பிக்க)
function clearBill() {
    localStorage.removeItem('myBillItems');
    items = [];
    location.reload();
}

//function generateBill() {
//    let printWindow = window.open('', '_blank', 'width=300,height=500');
//    printWindow.document.write('<html><head><title>Bill</title>');
//    printWindow.document.write(`
//        <style>
//            body { font-family: 'Courier New', monospace; font-size: 14px; width: 280px; margin: 0; padding: 5px; }
//            h2 { text-align: center; margin: 5px 0; }
//            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//            th { border-bottom: 1px dashed #000; text-align: left; }
//            td { padding: 5px 0; }
//            .total { border-top: 2px dashed #000; margin-top: 10px; font-weight: bold; font-size: 16px; }
//            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
//        </style>
//    `);
//    printWindow.document.write('</head><body>');
//    printWindow.document.write('<h2>AYYAPPAN STORE</h2>'); // உங்கள் கடை பெயரை மாற்றவும்
//    printWindow.document.write('<h3>No:135,P.H.ROAD,MADURAVOYAL</h3>');
//    printWindow.document.write('<h4>Mobile:9943514861</h4>');
 //   printWindow.document.write('<p>தேதி: ' + new Date().toLocaleDateString() + '</p>');
 //   printWindow.document.write(document.getElementById('billTable').outerHTML);
 //   printWindow.document.write('<div class="total">மொத்தம்: ₹' + document.getElementById('totalAmount').innerText + '</div>');
//    printWindow.document.write('<div class="footer">நன்றி! மீண்டும் வருக!</div>');
//    printWindow.document.write('</body></html>');
//    printWindow.document.close();
//    printWindow.print();
//}

function generateBill() {
    let printWindow = window.open('', '_blank', 'width=300,height=500');
    printWindow.document.write('<html><head><title>Bill</title>');
    printWindow.document.write(`
        <style>
            body { font-family: 'Courier New', monospace; font-size: 13px; width: 280px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { border-bottom: 1px dashed #000; text-align: left; }
            td { padding: 4px 0; }
            .total { border-top: 2px dashed #000; margin-top: 10px; font-weight: bold; }
        </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h2>AYYAPPAN STORE</h2>');
    printWindow.document.write('<h3>No:135,P.H.ROAD,MADURAVOYAL</h3>');
    printWindow.document.write('<h4>Mobile:9943514861</h4>');
    printWindow.document.write('<table><thead><tr><th>பெயர்</th><th>Qty</th><th>விலை</th><th>மொத்தம்</th></tr></thead><tbody>');
    
    // ஒவ்வொரு பொருளையும் பிரிண்ட் டேபிளில் சேர்த்தல்
    items.forEach(item => {
        printWindow.document.write(`<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.price}</td><td>${item.total}</td></tr>`);
    });
    
    printWindow.document.write('</tbody></table>');
    printWindow.document.write('<div class="total">மொத்தம்: ₹' + document.getElementById('totalAmount').innerText + '</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}


// பில் டிசைன் (அழகாக்க)
//function generateBill() {
 //   let printWindow = window.open('', '_blank');
 //   printWindow.document.write('<html><head><title>Bill</title>');
 //   printWindow.document.write('<style>body{font-family:sans-serif; padding:20px;} table{width:100%; border-collapse:collapse;} th,td{border-bottom:1px solid #000; padding:10px;}</style>');
 //   printWindow.document.write('</head><body>');
 //   printWindow.document.write('<h2>AYYAPPAN STORE</h2>');
 //   printWindow.document.write('<h3>No:135,P.H.ROAD,MADURAVOYAL</h3>');
 //   printWindow.document.write(document.getElementById('billTable').outerHTML);
 //   printWindow.document.write('<h4>மொத்தம்: ₹' + document.getElementById('totalAmount').innerText + '</h4>');
 //   printWindow.document.write('</body></html>');
 //   printWindow.document.close();
 //   printWindow.print();
//}

// விற்பனைப் பட்டியல்
function showReport() {
    let reportSection = document.getElementById('reportSection');
    let reportList = document.getElementById('reportList');
    reportList.innerHTML = "";
    
    items.forEach(item => {
        let li = document.createElement('li');
        li.innerText = `${item.name} - ₹${item.price}`;
        reportList.appendChild(li);
    });
    
    reportSection.style.display = "block";
}