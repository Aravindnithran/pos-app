let total = 0;

function addItem() {
    let name = document.getElementById("itemName").value;
    let price = parseFloat(document.getElementById("itemPrice").value);

    if (name && price) {
        let table = document.getElementById("billTable").getElementsByTagName('tbody')[0];
        let row = table.insertRow();
        row.insertCell(0).innerHTML = name;
        row.insertCell(1).innerHTML = "₹" + price;

        total += price;
        document.getElementById("totalAmount").innerText = total;

        // பெட்டிகளை காலி செய்ய
        document.getElementById("itemName").value = "";
        document.getElementById("itemPrice").value = "";
    } else {
        alert("தயவுசெய்து விபரங்களை நிரப்பவும்!");
    }
}

function generateBill() {
    window.print();
}