export default function handler(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Content-Type', 'application/json');

	res.status(200).json({
		success: true,
		message: 'Public Data Proxy Server is running!',
		timestamp: new Date().toISOString(),
		endpoints: {
			restaurants: '/api/restaurants',
			health: '/api/health',
		},
	});
}
