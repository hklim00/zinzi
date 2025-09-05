import fetch from 'node-fetch';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

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
		// 샘플 데이터로 동 목록 추출 (첫 3000건)
		const url = `http://openapi.seoul.go.kr:8088/${process.env.PUBLIC_DATA_KEY}/xml/LOCALDATA_072404_JN/1/3000/`;

		console.log('동 목록 추출을 위한 API 호출');
		const startTime = Date.now();
		
		const response = await fetch(url, {
			timeout: 25000,
			headers: {
				'User-Agent': 'Restaurant-Finder/1.0',
			},
		});
		
		const fetchTime = Date.now() - startTime;
		console.log(`API 응답 시간: ${fetchTime}ms, 상태: ${response.status}`);

		if (!response.ok) {
			throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
		}

		const xmlData = await response.text();
		const jsonData = await parseXml(xmlData);

		// XML 구조 확인 및 데이터 추출
		if (!jsonData.LOCALDATA_072404_JN || !jsonData.LOCALDATA_072404_JN.row) {
			throw new Error('API 응답 형식이 올바르지 않습니다');
		}

		const restaurants = jsonData.LOCALDATA_072404_JN.row;

		// 동 목록 추출
		const dongSet = new Set();
		restaurants.forEach(restaurant => {
			const address = restaurant.SITEWHLADDR?.[0] || restaurant.RDNWHLADDR?.[0] || '';
			
			// 주소에서 동 이름 추출 (서울특별시 종로구 다음 부분)
			const match = address.match(/서울특별시\s+종로구\s+([^\s]+)/);
			if (match && match[1]) {
				let dongName = match[1];
				
				// 숫자가 포함된 동 처리 (예: 관훈동, 삼청동, 종로1가동 등)
				if (dongName.includes('동') || dongName.includes('가')) {
					dongSet.add(dongName);
				}
			}
		});

		// 동 목록을 배열로 변환하고 정렬
		const dongList = Array.from(dongSet)
			.filter(dong => dong.length > 1) // 너무 짧은 것들 제외
			.sort();

		console.log(`추출된 동 목록: ${dongList.length}개`);

		// 성공 응답
		res.status(200).json({
			success: true,
			districts: dongList,
			totalCount: dongList.length,
			extractedFrom: restaurants.length,
			timestamp: new Date().toISOString(),
		});
	} catch (err) {
		console.error('동 목록 추출 실패:', err);

		res.status(500).json({
			success: false,
			error: '동 목록 추출 실패',
			detail: err.message,
			timestamp: new Date().toISOString(),
		});
	}
}
