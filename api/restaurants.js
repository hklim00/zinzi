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
		// 쿼리 파라미터 추출
		const { startIdx = 1, endIdx = 1000 } = req.query;

		// 서울시 공공데이터 API URL 구성
		const url = `http://openapi.seoul.go.kr:8088/${process.env.PUBLIC_DATA_KEY}/xml/LOCALDATA_072404_JN/${startIdx}/${endIdx}/`;

		console.log('API 요청 URL:', url);

		// 공공데이터포털 API 호출
		const response = await fetch(url, {
			timeout: 15000,
			headers: {
				'User-Agent': 'Restaurant-Finder/1.0',
			},
		});

		if (!response.ok) {
			throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
		}

		const xmlData = await response.text();
		const jsonData = await parseXml(xmlData);

		// XML 구조 확인 및 데이터 추출
		if (!jsonData.LOCALDATA_072404_JN || !jsonData.LOCALDATA_072404_JN.row) {
			throw new Error('API 응답 형식이 올바르지 않습니다');
		}

		const result = jsonData.LOCALDATA_072404_JN.RESULT[0];
		const restaurants = jsonData.LOCALDATA_072404_JN.row;

		// XML 데이터를 프론트엔드에서 사용하는 형식으로 변환
		const transformedData = restaurants
			.map(restaurant => ({
				id: restaurant.MGTNO?.[0] || '',
				업소명: restaurant.BPLCNM?.[0] || '',
				업태구분명: restaurant.UPTAENM?.[0] || '',
				소재지전체주소: restaurant.SITEWHLADDR?.[0] || '',
				도로명전체주소: restaurant.RDNWHLADDR?.[0] || '',
				소재지전화: restaurant.SITETEL?.[0] || '',
				영업상태명: restaurant.TRDSTATENM?.[0] || '',
				폐업일자: restaurant.DCBYMD?.[0] || '',
				허가일자: restaurant.APVPERMYMD?.[0] || '',
				좌표정보X: restaurant.X?.[0] || '',
				좌표정보Y: restaurant.Y?.[0] || '',
				시설총규모: restaurant.FACILTOTSCP?.[0] || '',
				소재지우편번호: restaurant.SITEPOSTNO?.[0] || '',
				도로명우편번호: restaurant.RDNPOSTNO?.[0] || ''
			}))
			// 서버에서 미리 영업중인 업소만 필터링
			.filter(restaurant => {
				const status = restaurant.영업상태명;
				return status && (
					status.includes('영업') ||
					status.includes('정상') ||
					status === '운영중' ||
					status === '영업/정상'
				);
			});

		console.log(`원본: ${restaurants.length}건 → 영업중: ${transformedData.length}건`);

		// 성공 응답
		res.status(200).json({
			success: true,
			data: transformedData,
			totalCount: parseInt(jsonData.LOCALDATA_072404_JN.list_total_count?.[0] || 0),
			result: {
				code: result?.CODE?.[0] || '',
				message: result?.MESSAGE?.[0] || ''
			},
			requestInfo: {
				startIdx: parseInt(startIdx),
				endIdx: parseInt(endIdx),
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
