# React + Vite

## 로컬 실행

프런트엔드는 `npm install` 후 `npm run dev`로 실행합니다. 상품 조회·등록은 별도로 실행 중인 백엔드가 필요하며, Vite는 `/api` 요청을 `http://localhost:8000`으로 전달합니다. `ECONNREFUSED`는 해당 주소에서 백엔드가 요청을 받지 못할 때 발생합니다.

백엔드 프로젝트에서 Python 3.12 이상과 PostgreSQL을 준비하고 의존성을 설치한 뒤 `DATABASE_URL`을 설정하여 `uvicorn app.main:app --port 8000`으로 실행하세요. 상품 API는 `X-User-Id: 1`을 사용하므로 데이터베이스의 `store_users`에 해당 사용자가 있어야 합니다. 백엔드에는 현재 사용자 시드 자동 생성 기능이 없습니다. 데이터베이스 연결 정보는 공유하지 말고 환경변수로 설정하세요.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
