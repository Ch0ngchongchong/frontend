# React + Vite

## 로컬 실행

프런트엔드는 `npm install` 후 `npm run dev`로 실행합니다. 상품 조회·등록·수정 요청은 `/api`를 통해 `https://chongchongchongchong.vercel.app`으로 전달됩니다. 로컬 백엔드를 별도로 실행할 필요가 없습니다.

개발 환경에서는 `vite.config.js`의 프록시를 사용합니다. Vercel에 프런트엔드를 배포하면 `vercel.json`의 rewrite가 같은 역할을 하므로 브라우저에서 백엔드를 직접 호출하지 않습니다. 다른 호스팅에서는 `/api/*`를 백엔드의 `/*`로 전달하는 리버스 프록시를 설정해야 합니다. `npm run preview`는 정적 빌드 확인용이며 API 프록시는 제공하지 않습니다.

상품 API는 로그인 구현 전까지 임시 헤더 `X-User-Id: 1`을 사용합니다. 백엔드 DB에 해당 사용자가 있어야 합니다. 백엔드 주소 변경 시 `vite.config.js`와 `vercel.json`을 함께 수정하세요. 현재 상품 화면만 실제 API와 연결되어 있으며, 발주·검수·거래처 등 나머지 화면은 기존 디자인 시안입니다.

백엔드의 `/openapi.json`에서 API 명세를 확인할 수 있습니다. 상품 조회가 `500`을 반환하면 백엔드의 Vercel 함수 로그와 DB 연결·환경변수·사용자 데이터를 확인해야 합니다.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
