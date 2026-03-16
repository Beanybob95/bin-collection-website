const axios = require('axios');

module.exports.addressList = async (req, res) => {
    try {
        const { postcode } = req.body;

        if (!postcode) {
            return res.status(400).json({ error: 'Postcode is required' });
        }

        const response = await axios.post(
            'https://ilforms.wiltshire.gov.uk/wastecollectiondays/addresslist',
            `Postcode=${encodeURIComponent(postcode)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error proxying address request:', error);
        res.status(500).json({
            error: 'Error fetching addresses',
            message: error.message
        });
    }
};