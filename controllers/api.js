const axios = require('axios');
const apiDebug = require('debug')('app:api');

module.exports.addressList = async (req, res) => {
    try {
        const { postcode } = req.body;

        if (!postcode) {
            return res.status(400).json({ error: 'Postcode is required' });
        }

        // This route proxies the council's address lookup API rather than calling it
        // directly from the browser, so the API endpoint URL never leaks to clients.
        // The council API requires application/x-www-form-urlencoded, not JSON.
        const response = await axios.post(
            process.env.ADDRESS_LIST_API,
            `Postcode=${encodeURIComponent(postcode)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        apiDebug('Error proxying address request: ', error);
        res.status(500).json({
            error: 'Error fetching addresses',
            message: error.message,
        });
    }
};
