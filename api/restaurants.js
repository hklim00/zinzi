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
		// 쿼리 파라미터 추출 (종로1가 필터링 적용)
		const { startIdx = 1, endIdx = 1000 } = req.query;
		const dong = '종로1가'; // 종로1가로 다시 필터링

		// 요청 크기 제한 (초식곳간 찾기 위해 대폭 확대)
		const maxRequestSize = 10000; // 10000건으로 대폭 확대
		const requestSize = parseInt(endIdx) - parseInt(startIdx) + 1;

		if (requestSize > maxRequestSize) {
			return res.status(400).json({
				success: false,
				error: '요청 크기 초과',
				detail: `최대 ${maxRequestSize}건까지 요청 가능합니다. 현재 요청: ${requestSize}건`,
				timestamp: new Date().toISOString(),
			});
		}

		// 서울시 공공데이터 API URL 구성
		const url = `http://openapi.seoul.go.kr:8088/${process.env.PUBLIC_DATA_KEY}/xml/LOCALDATA_072404_JN/${startIdx}/${endIdx}/`;

		console.log('API 요청 URL:', url);

		// 공공데이터포털 API 호출
		console.log(`요청 크기: ${requestSize}건 (${startIdx}-${endIdx})`);
		const startTime = Date.now();

		const response = await fetch(url, {
			timeout: 25000, // 25초로 증가
			headers: {
				'User-Agent': 'Restaurant-Finder/1.0',
			},
		});

		const fetchTime = Date.now() - startTime;
		console.log(`API 응답 시간: ${fetchTime}ms, 상태: ${response.status}`);

		if (!response.ok) {
			throw new Error(
				`API 호출 실패: ${response.status} ${response.statusText}`
			);
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
		const mappedData = restaurants.map((restaurant) => ({
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
			도로명우편번호: restaurant.RDNPOSTNO?.[0] || '',
		}));

		console.log(`🏢 총 가져온 업소 수: ${mappedData.length}건`);

		// 종로1가 업소 찾기 (영업상태 무관)
		const jongro1gaAll = mappedData.filter((restaurant) => {
			const jibunAddress = restaurant.소재지전체주소 || '';
			return jibunAddress.includes(dong);
		});
		console.log(`📍 종로1가 전체 업소: ${jongro1gaAll.length}건`);

		// 초식곳간 찾기
		const chosikTarget = mappedData.find((r) => r.업소명?.includes('초식곳간'));
		if (chosikTarget) {
			console.log(`🎯 초식곳간 발견!`);
			console.log(`   - 업소명: ${chosikTarget.업소명}`);
			console.log(`   - 영업상태: ${chosikTarget.영업상태명}`);
			console.log(`   - 지번주소: ${chosikTarget.소재지전체주소}`);
			console.log(`   - 도로명주소: ${chosikTarget.도로명전체주소}`);
		} else {
			console.log(`❌ 초식곳간 미발견 (전체 ${mappedData.length}건 중)`);
		}

		// 영업상태 필터링 다시 적용
		const transformedData = mappedData.filter((restaurant) => {
			const status = restaurant.영업상태명;
			const isActive =
				status &&
				(status.includes('영업') ||
					status.includes('정상') ||
					status === '운영중' ||
					status === '영업/정상');

			// 동 필터링 (지번주소에서만 확인)
			if (dong && isActive) {
				const jibunAddress = restaurant.소재지전체주소 || '';
				return jibunAddress.includes(dong);
			}

			return isActive;
		});

		console.log(
			`✅ 최종 필터링된 업소: ${transformedData.length}건 (영업중 + 종로1가)`
		);
		const finalChosik = transformedData.find((r) =>
			r.업소명?.includes('초식곳간')
		);
		if (finalChosik) {
			console.log(`🎯 최종 결과에 초식곳간 포함됨!`);
		} else {
			console.log(`❌ 최종 결과에 초식곳간 없음`);
		}

		console.log(
			`원본: ${restaurants.length}건 → 영업중: ${transformedData.length}건`
		);

		// 성공 응답
		res.status(200).json({
			success: true,
			data: transformedData,
			totalCount: parseInt(
				jsonData.LOCALDATA_072404_JN.list_total_count?.[0] || 0
			),
			result: {
				code: result?.CODE?.[0] || '',
				message: result?.MESSAGE?.[0] || '',
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
