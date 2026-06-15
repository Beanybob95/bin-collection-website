document
    .getElementById('findAddress')
    .addEventListener('click', async function () {
        const postcode = document.getElementById('postcode').value.trim();

        if (!postcode) {
            alert('Please enter a postcode');
            return;
        }

        try {
            const response = await fetch('/api/addresslist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ postcode: postcode }),
            });

            if (!response.ok) {
                alert('Error fetching addresses. Please try again.');
                return;
            }

            const data = await response.json();

            window.addressData = data;

            document.getElementById('postcode-hidden').value = postcode;

            if (
                data &&
                data.IsSuccess &&
                data.Model &&
                data.Model.PostcodeAddresses &&
                data.Model.PostcodeAddresses.length > 0
            ) {
                const selectElement = document.getElementById('address-select');

                selectElement.innerHTML = '';

                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Please select your address';
                selectElement.appendChild(defaultOption);

                data.Model.PostcodeAddresses.forEach((address) => {
                    const option = document.createElement('option');
                    option.value = address.UPRN;
                    option.textContent = address.Address;
                    option.dataset.address = JSON.stringify(address);
                    selectElement.appendChild(option);
                });

                document.getElementById('address-results').style.display =
                    'block';
            } else {
                alert('No addresses found for this postcode');
            }
        } catch (error) {
            alert('Error fetching addresses. Please try again.');
        }
    });

document
    .getElementById('address-select')
    .addEventListener('change', function () {
        if (this.value) {
            const addressData = window.addressData.Model.PostcodeAddresses.find(
                (address) => address.UPRN === this.value
            );

            if (addressData) {
                document.getElementById('housenumber-hidden').value =
                    addressData.PropertyNameAndNumber || '';
                document.getElementById('roadname-hidden').value =
                    addressData.Street || '';
                document.getElementById('county-hidden').value =
                    addressData.County || '';
            }
        }
    });
