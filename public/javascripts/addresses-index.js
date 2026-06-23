const addressPickerSelect = document.getElementById('address-picker-select');
const selectAddressBtn = document.getElementById('selectAddress');
const manageAddressBtn = document.getElementById('manageAddress');
const addAddressBtn = document.getElementById('addAddress');

selectAddressBtn.addEventListener('click', function () {
    window.location.href = '/bincollection/' + encodeURIComponent(addressPickerSelect.value);
});

manageAddressBtn.addEventListener('click', function () {
    window.location.href = '/addresses/' + encodeURIComponent(addressPickerSelect.value);
});

addAddressBtn.addEventListener('click', function () {
    window.location.href = '/addresses/new';
});
