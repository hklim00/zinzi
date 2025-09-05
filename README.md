# 🍽️ 공공데이터포털 API 프록시 서버

공공데이터포털의 식품위생업소 현황 API CORS 문제를 해결하기 위한 Vercel 프록시 서버

## 🚀 배포 과정

### 1. GitHub 레포지토리 생성 및 업로드

```bash
# Git 초기화
git init
git add .
git commit -m "공공데이터 중계 서버"
git branch -M main

# GitHub에 업로드 (본인 GitHub 주소로 변경)
git remote add origin https://github.com/내아이디/public-data-proxy.git
git push -u origin main
```

### 2. Vercel 배포

1. [Vercel](https://vercel.com) 접속 → GitHub 연동
2. `public-data-proxy` 레포 선택 후 Import
3. **Settings** → **Environment Variables** → `PUBLIC_DATA_KEY` 등록
4. **Deploy** 클릭 → 배포 완료

### 3. 환경 변수 설정

Vercel 대시보드에서 환경 변수 추가:

- **Key**: `PUBLIC_DATA_KEY`
- **Value**: 공공데이터포털에서 발급받은 서비스 키

## 📡 API 사용법

### 배포된 URL 예시

```
https://public-data-proxy.vercel.app
```

### 엔드포인트

#### 1. 식당 데이터 조회

```
GET /api/restaurants
```

**파라미터:**

- `startIdx`: 시작 인덱스 (기본값: 1)
- `endIdx`: 끝 인덱스 (기본값: 100)
- `sigunNm`: 시군명 (선택사항)
- `업태구분명`: 업종 구분 (선택사항)

**사용 예시:**

```javascript
// 기본 조회
fetch('https://public-data-proxy.vercel.app/api/restaurants')
	.then((res) => res.json())
	.then((data) => console.log(data));

// 범위 지정 조회
fetch(
	'https://public-data-proxy.vercel.app/api/restaurants?startIdx=1&endIdx=50'
)
	.then((res) => res.json())
	.then((data) => console.log(data));

// 지역 필터링
fetch('https://public-data-proxy.vercel.app/api/restaurants?sigunNm=종로구')
	.then((res) => res.json())
	.then((data) => console.log(data));
```

#### 2. 헬스 체크

```
GET /api/health
```

## 🔧 로컬 개발

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# 테스트
curl "http://localhost:3000/api/health"
```

## 📝 주요 기능

- ✅ CORS 문제 완전 해결
- ✅ 공공데이터포털 API 프록시
- ✅ 에러 핸들링
- ✅ 요청 로깅
- ✅ 간단한 구조

## 🔄 프론트엔드 연동

### 1. 프록시 서버 URL 업데이트

배포 완료 후, `src/services/publicDataAPI.ts` 파일 수정:

```typescript
// 1. 실제 배포된 URL로 변경
private readonly PROXY_API_ENDPOINT = 'https://실제배포된주소.vercel.app/api/restaurants';

// 2. 프록시 서버 사용 활성화
private readonly USE_PROXY_SERVER = true;
```

### 2. 사용 예시

```javascript
// 프록시 서버를 통한 API 호출
fetch('https://your-project.vercel.app/api/restaurants?startIdx=1&endIdx=100')
	.then((res) => res.json())
	.then((data) => {
		console.log('성공:', data.success);
		console.log('데이터:', data.data);
	})
	.catch((err) => console.error('오류:', err));
```

## 📋 배포 체크리스트

### 배포 전

- [ ] GitHub 레포지토리 생성
- [ ] 공공데이터포털 API 키 준비
- [ ] 코드 커밋 및 푸시

### 배포 중

- [ ] Vercel에서 GitHub 연동
- [ ] 프로젝트 Import
- [ ] 환경 변수 `PUBLIC_DATA_KEY` 설정
- [ ] Deploy 실행

### 배포 후

- [ ] `/api/health` 엔드포인트 테스트
- [ ] `/api/restaurants` 기본 호출 테스트
- [ ] 프론트엔드 코드에 실제 URL 반영
- [ ] `USE_PROXY_SERVER = true` 설정
