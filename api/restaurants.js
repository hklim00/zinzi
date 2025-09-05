import fetch from 'node-fetch';

export default async function handler(req, res) {
	// CORS 헤더 설정
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// OPTIONS 요청 처리 (CORS preflight)
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	try {
		// 쿼리 파라미터 추출
		const { startIdx = 1, endIdx = 100, sigunNm, 업태구분명 } = req.query;

		// 공공데이터포털 API URL 구성
		let url = `http://openapi.foodsafetykorea.go.kr/api/${process.env.PUBLIC_DATA_KEY}/COOKRST/json/${startIdx}/${endIdx}`;

		// 선택적 파라미터 추가
		const params = new URLSearchParams();
		if (sigunNm) params.append('sigunNm', sigunNm);
		if (업태구분명) params.append('업태구분명', 업태구분명);

		if (params.toString()) {
			url += `?${params.toString()}`;
		}

		console.log('API 요청 URL:', url);

		// 공공데이터포털 API 호출
		const response = await fetch(url, {
			timeout: 8000,
			headers: {
				'User-Agent': 'Restaurant-Finder/1.0',
			},
		});

		if (!response.ok) {
			throw new Error(`API 호출 실패: ${response.status}`);
		}

		const data = await response.json();

		// 성공 응답
		res.status(200).json({
			success: true,
			data: data,
			requestInfo: {
				startIdx: parseInt(startIdx),
				endIdx: parseInt(endIdx),
				sigunNm,
				업태구분명,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (err) {
		console.error('API 호출 실패:', err);

		res.status(500).json({
			success: false,
			error: 'API 호출 실패',
			detail: err.message,
			timestamp: new Date().toISOString(),
		});
	}
}
